const EDITABLE_PATHS = new Set([
  "data/site-settings.json",
  "data/gateway.json",
  "data/gateway-appearance.json",
]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function secretKey(secret, algorithmName) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  const algorithm =
    algorithmName === "AES-GCM"
      ? { name: "AES-GCM" }
      : { name: "HMAC", hash: "SHA-256" };
  const usages =
    algorithmName === "AES-GCM"
      ? ["encrypt", "decrypt"]
      : ["sign", "verify"];
  return crypto.subtle.importKey("raw", digest, algorithm, false, usages);
}

async function signState(payload, secret) {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await secretKey(secret, "HMAC");
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyState(token, secret) {
  const [body, signature] = token.split(".");
  if (!body || !signature) throw new Error("Invalid OAuth state.");
  const key = await secretKey(secret, "HMAC");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signature),
    encoder.encode(body),
  );
  if (!valid) throw new Error("OAuth state signature failed.");
  const payload = JSON.parse(decoder.decode(base64UrlDecode(body)));
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("OAuth state expired.");
  }
  return payload;
}

async function encryptSession(payload, secret) {
  const key = await secretKey(secret, "AES-GCM");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return base64UrlEncode(combined);
}

async function decryptSession(token, secret) {
  const bytes = base64UrlDecode(token);
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const key = await secretKey(secret, "AES-GCM");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipher,
  );
  const payload = JSON.parse(decoder.decode(plain));
  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("Session expired.");
  }
  return payload;
}

function allowedOrigins(env) {
  return new Set([
    env.ALLOWED_ORIGIN,
    ...(env.LOCAL_ADMIN_ORIGINS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  ]);
}

function validReturnTo(value, env) {
  try {
    const url = new URL(value);
    if (!allowedOrigins(env).has(url.origin)) return null;
    if (!url.pathname.startsWith("/admin1")) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins(env).has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,PUT,OPTIONS",
    "access-control-allow-headers": "Authorization,Content-Type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

async function requireSession(request, env) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    throw new Response(
      JSON.stringify({ error: "Authentication required." }),
      { status: 401 },
    );
  }
  try {
    const session = await decryptSession(
      header.slice(7),
      env.SESSION_SECRET,
    );
    if (
      session.login.toLowerCase() !==
      env.ALLOWED_GITHUB_LOGIN.toLowerCase()
    ) {
      throw new Error("User not allowed.");
    }
    return session;
  } catch {
    throw new Response(
      JSON.stringify({ error: "Session expired or invalid." }),
      { status: 401 },
    );
  }
}

async function github(path, token, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "CyberSabil-Admin1",
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.message || `GitHub HTTP ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function decodeGitHubContent(content) {
  const clean = content.replace(/\n/g, "");
  return decoder.decode(
    Uint8Array.from(atob(clean), (char) => char.charCodeAt(0)),
  );
}

function normalizeFiles(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 3) {
    throw new Error("Between 1 and 3 files are required.");
  }

  const seen = new Set();
  return input.map((file) => {
    if (!file || !EDITABLE_PATHS.has(file.path)) {
      throw new Error("Path not allowed.");
    }
    if (seen.has(file.path)) {
      throw new Error("Duplicate file path.");
    }
    seen.add(file.path);

    if (!file.sha || typeof file.sha !== "string") {
      throw new Error("Original GitHub SHA is required.");
    }
    if (
      !file.content ||
      typeof file.content !== "object" ||
      Array.isArray(file.content)
    ) {
      throw new Error("JSON object content is required.");
    }

    const text = `${JSON.stringify(file.content, null, 2)}\n`;
    if (text.length > 250000) {
      throw new Error("File is too large.");
    }
    return {
      path: file.path,
      sha: file.sha,
      text,
    };
  });
}

async function atomicCommit(files, message, session, env) {
  const ownerRepo = `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`;
  const branchEncoded = encodeURIComponent(env.GITHUB_BRANCH);

  const ref = await github(
    `/repos/${ownerRepo}/git/ref/heads/${branchEncoded}`,
    session.token,
  );
  const baseCommitSha = ref.object.sha;

  const current = await Promise.all(
    files.map(async (file) => {
      const item = await github(
        `/repos/${ownerRepo}/contents/${file.path}?ref=${branchEncoded}`,
        session.token,
      );
      return { path: file.path, sha: item.sha };
    }),
  );

  for (const item of current) {
    const expected = files.find((file) => file.path === item.path);
    if (item.sha !== expected.sha) {
      const conflict = new Error(
        `GitHub file changed since load: ${item.path}`,
      );
      conflict.status = 409;
      throw conflict;
    }
  }

  const baseCommit = await github(
    `/repos/${ownerRepo}/git/commits/${baseCommitSha}`,
    session.token,
  );

  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await github(
        `/repos/${ownerRepo}/git/blobs`,
        session.token,
        {
          method: "POST",
          body: JSON.stringify({
            content: file.text,
            encoding: "utf-8",
          }),
        },
      );
      return {
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      };
    }),
  );

  const tree = await github(
    `/repos/${ownerRepo}/git/trees`,
    session.token,
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: blobs,
      }),
    },
  );

  const commit = await github(
    `/repos/${ownerRepo}/git/commits`,
    session.token,
    {
      method: "POST",
      body: JSON.stringify({
        message: String(message || "Admin1: update Gateway settings")
          .slice(0, 150),
        tree: tree.sha,
        parents: [baseCommitSha],
      }),
    },
  );

  try {
    await github(
      `/repos/${ownerRepo}/git/refs/heads/${branchEncoded}`,
      session.token,
      {
        method: "PATCH",
        body: JSON.stringify({
          sha: commit.sha,
          force: false,
        }),
      },
    );
  } catch (error) {
    if (error.status === 409 || error.status === 422) {
      const conflict = new Error(
        "GitHub branch changed during save.",
      );
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  return {
    commit: commit.sha,
    files: blobs.map((blob) => ({
      path: blob.path,
      sha: blob.sha,
    })),
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/") {
        return json(
          {
            service: "CyberSabil Admin1 API",
            status: "ok",
            branch: env.GITHUB_BRANCH,
          },
          200,
          cors,
        );
      }

      if (url.pathname === "/auth") {
        const returnTo = validReturnTo(
          url.searchParams.get("return_to") ||
            env.PRODUCTION_ADMIN_URL,
          env,
        );
        if (!returnTo) {
          return json({ error: "Invalid return URL." }, 400);
        }

        const state = await signState(
          {
            returnTo,
            exp: Date.now() + 10 * 60 * 1000,
          },
          env.SESSION_SECRET,
        );

        const auth = new URL(
          "https://github.com/login/oauth/authorize",
        );
        auth.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
        auth.searchParams.set(
          "redirect_uri",
          `${url.origin}/callback`,
        );
        auth.searchParams.set("scope", "public_repo read:user");
        auth.searchParams.set("state", state);
        return Response.redirect(auth.toString(), 302);
      }

      if (url.pathname === "/callback") {
        const code = url.searchParams.get("code");
        const stateToken = url.searchParams.get("state");
        if (!code || !stateToken) {
          return json(
            { error: "OAuth callback is incomplete." },
            400,
          );
        }

        const state = await verifyState(
          stateToken,
          env.SESSION_SECRET,
        );

        const tokenResponse = await fetch(
          "https://github.com/login/oauth/access_token",
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type":
                "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code,
              redirect_uri: `${url.origin}/callback`,
            }),
          },
        );

        const tokenPayload = await tokenResponse.json();
        if (!tokenPayload.access_token) {
          return json(
            {
              error:
                tokenPayload.error_description ||
                "GitHub token exchange failed.",
            },
            401,
          );
        }

        const user = await github(
          "/user",
          tokenPayload.access_token,
        );

        if (
          user.login.toLowerCase() !==
          env.ALLOWED_GITHUB_LOGIN.toLowerCase()
        ) {
          return json(
            { error: "This GitHub user is not allowed." },
            403,
          );
        }

        const session = await encryptSession(
          {
            token: tokenPayload.access_token,
            login: user.login,
            avatar: user.avatar_url,
            exp: Date.now() + 8 * 60 * 60 * 1000,
          },
          env.SESSION_SECRET,
        );

        return Response.redirect(
          `${state.returnTo}#auth=${encodeURIComponent(session)}`,
          302,
        );
      }

      if (
        url.pathname === "/api/session" &&
        request.method === "GET"
      ) {
        const session = await requireSession(request, env);
        return json(
          {
            user: {
              login: session.login,
              avatar: session.avatar,
            },
            repository:
              `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`,
            branch: env.GITHUB_BRANCH,
          },
          200,
          cors,
        );
      }

      if (
        url.pathname === "/api/file" &&
        request.method === "GET"
      ) {
        const session = await requireSession(request, env);
        const path = url.searchParams.get("path") || "";
        if (!EDITABLE_PATHS.has(path)) {
          return json({ error: "Path not allowed." }, 403, cors);
        }

        const item = await github(
          `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}` +
            `/contents/${path}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
          session.token,
        );

        return json(
          {
            path,
            sha: item.sha,
            content: JSON.parse(
              decodeGitHubContent(item.content),
            ),
          },
          200,
          cors,
        );
      }

      if (
        url.pathname === "/api/files" &&
        request.method === "PUT"
      ) {
        const session = await requireSession(request, env);
        const body = await request.json();
        let files;
        try {
          files = normalizeFiles(body.files);
        } catch (error) {
          return json({ error: error.message }, 400, cors);
        }

        try {
          const result = await atomicCommit(
            files,
            body.message,
            session,
            env,
          );
          return json(result, 200, cors);
        } catch (error) {
          if (error.status === 409 || error.status === 422) {
            return json(
              {
                error:
                  "GitHub file or branch changed since it was loaded.",
                conflict: true,
              },
              409,
              cors,
            );
          }
          throw error;
        }
      }

      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      if (error instanceof Response) {
        const headers = new Headers(error.headers);
        Object.entries(cors).forEach(([key, value]) =>
          headers.set(key, value),
        );
        return new Response(error.body, {
          status: error.status,
          headers,
        });
      }
      return json(
        { error: error.message || "Unexpected Worker error." },
        500,
        cors,
      );
    }
  },
};
