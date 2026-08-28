import { spawn, execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import ngrok from "ngrok";

let activeTunnelProcess = null;
let activeNgrok = false;
let tunnelUrl = null;

/**
 * Appends a missing variable to the project's .env file if not already present.
 * @param {string} rootDir - Project root path.
 * @param {string} keyName - Environment variable name.
 * @param {string} [defaultValue=""] - Default placeholder.
 */
async function ensureEnvVariable(rootDir, keyName, defaultValue = "") {
  const envPath = path.join(path.resolve(rootDir), ".env");
  let content = "";
  try {
    content = await fs.readFile(envPath, "utf-8");
  } catch {}

  const regex = new RegExp(`^${keyName}\\s*=`, "m");
  if (!regex.test(content)) {
    const suffix = content.endsWith("\n") || content.length === 0 ? "" : "\n";
    content += `${suffix}${keyName}=${defaultValue}\n`;
    await fs.writeFile(envPath, content, "utf-8");
  }
}

/**
 * Starts a public tunnel to the local server using the selected service.
 * Supports localhost.run, serveo.net, ngrok, and cloudflare.
 * @param {number} port - Local port to expose.
 * @param {string} [service='localhost.run'] - Selected provider.
 * @param {string} [projectDir='.'] - Project root directory.
 * @returns {Promise<string|null>} The public URL or null.
 */
export async function startTunnel(port, service = "localhost.run", projectDir = ".") {
  const envPath = path.join(path.resolve(projectDir), ".env");
  dotenv.config({ path: envPath });

  if (service === "local" || service === "local only") {
    return null;
  }

  // 1. localhost.run (Zero-token native SSH)
  if (service === "localhost.run" || service === "localtunnel") {
    return new Promise((resolve, reject) => {
      console.log("🚀 Starting secure tunnel via localhost.run (zero tokens required)...");

      const sshProcess = spawn(
        "ssh",
        [
          "-R",
          `80:localhost:${port}`,
          "-o",
          "StrictHostKeyChecking=no",
          "-o",
          "ServerAliveInterval=30",
          "nokey@localhost.run"
        ],
        {
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      activeTunnelProcess = sshProcess;
      let output = "";
      let resolved = false;

      sshProcess.stdout.on("data", (data) => {
        const text = data.toString();
        output += text;

        const urlMatch = text.match(/(https:\/\/[a-zA-Z0-9.-]+\.(lhr\.life|localhost\.run))/i);
        if (urlMatch && !resolved) {
          resolved = true;
          tunnelUrl = urlMatch[1];
          console.log("✅ Tunnel established!");
          resolve(tunnelUrl);
        }
      });

      sshProcess.stderr.on("data", (data) => {
        const errText = data.toString();
        if (
          errText.includes("Could not resolve hostname") ||
          errText.includes("Connection refused")
        ) {
          if (!resolved) {
            reject(new Error(`Tunnel failed: ${errText.trim()}`));
          }
        }
      });

      sshProcess.on("close", (code) => {
        if (code !== 0 && !resolved) {
          reject(new Error(`Tunnel process exited with code ${code}. Output: ${output.trim()}`));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          try {
            sshProcess.kill();
          } catch {}
          reject(new Error("Tunnel startup timed out. Please check your network connection."));
        }
      }, 12000);
    });
  }

  // 2. serveo.net (Zero-token native SSH)
  if (service === "serveo.net") {
    return new Promise((resolve, reject) => {
      console.log("🚀 Starting secure tunnel via serveo.net (zero tokens required)...");

      const sshProcess = spawn(
        "ssh",
        [
          "-R",
          `80:localhost:${port}`,
          "-o",
          "StrictHostKeyChecking=no",
          "-o",
          "ServerAliveInterval=30",
          "serveo.net"
        ],
        {
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      activeTunnelProcess = sshProcess;
      let resolved = false;

      sshProcess.stdout.on("data", (data) => {
        const text = data.toString();
        const urlMatch = text.match(/(https:\/\/[a-zA-Z0-9.-]+\.serveousercontent\.com|https:\/\/[a-zA-Z0-9.-]+\.serveo\.net)/i);
        if (urlMatch && !resolved) {
          resolved = true;
          tunnelUrl = urlMatch[1];
          console.log("✅ Tunnel established!");
          resolve(tunnelUrl);
        }
      });

      sshProcess.on("close", (code) => {
        if (code !== 0 && !resolved) {
          reject(new Error(`Serveo tunnel exited with code ${code}`));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          try {
            sshProcess.kill();
          } catch {}
          reject(new Error("Serveo tunnel startup timed out."));
        }
      }, 12000);
    });
  }

  // 3. ngrok (Requires free token)
  if (service === "ngrok") {
    let token = process.env.NGROK_AUTHTOKEN;
    if (!token || !token.trim()) {
      await ensureEnvVariable(projectDir, "NGROK_AUTHTOKEN", "");
      console.log(`
⚠️  Ngrok requires a free authentication token.
    Added 'NGROK_AUTHTOKEN=' to your .env file.

📝 Step-by-step setup guide:
1. Sign up or log in at: https://dashboard.ngrok.com/signup
2. Copy your Authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken
3. Open your .env file and paste your token:
   NGROK_AUTHTOKEN=your_actual_token_here
4. Restart the server with:
   node src/index.js serve --public --project ${projectDir}
`);
      process.exit(1);
    }

    try {
      console.log("🚀 Starting ngrok tunnel...");
      const url = await ngrok.connect({
        addr: port,
        authtoken: token.trim(),
        proto: "http"
      });
      activeNgrok = true;
      console.log("✅ Ngrok tunnel established!");
      return url;
    } catch (err) {
      throw new Error(`Failed to establish ngrok tunnel: ${err.message}`);
    }
  }

  // 4. Cloudflare Tunnels (Quick tunnel via cloudflared or token)
  if (service === "cloudflare") {
    let hasCloudflared = false;
    try {
      execSync("which cloudflared", { stdio: "ignore" });
      hasCloudflared = true;
    } catch {}

    if (!hasCloudflared) {
      await ensureEnvVariable(projectDir, "CLOUDFLARE_TUNNEL_TOKEN", "");
      console.log(`
⚠️  Cloudflare Quick Tunnels require 'cloudflared' installed on your machine.
    Added 'CLOUDFLARE_TUNNEL_TOKEN=' to your .env file for named tunnels.

📝 Step-by-step installation guide:
- macOS:   brew install cloudflared
- Linux:   sudo apt-get install cloudflared  (or curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i cloudflared.deb)
- Windows: winget install Cloudflare.cloudflared

Once installed, simply re-run:
node src/index.js serve --public --project ${projectDir}
`);
      process.exit(1);
    }

    return new Promise((resolve, reject) => {
      console.log("🚀 Starting Cloudflare Quick Tunnel...");
      const cfProcess = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${port}`], {
        stdio: ["ignore", "pipe", "pipe"]
      });

      activeTunnelProcess = cfProcess;
      let resolved = false;

      const handleOutput = (data) => {
        const text = data.toString();
        const urlMatch = text.match(/(https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com)/i);
        if (urlMatch && !resolved) {
          resolved = true;
          tunnelUrl = urlMatch[1];
          console.log("✅ Cloudflare tunnel established!");
          resolve(tunnelUrl);
        }
      };

      cfProcess.stdout.on("data", handleOutput);
      cfProcess.stderr.on("data", handleOutput);

      cfProcess.on("close", (code) => {
        if (code !== 0 && !resolved) {
          reject(new Error(`Cloudflare tunnel exited with code ${code}`));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          try {
            cfProcess.kill();
          } catch {}
          reject(new Error("Cloudflare tunnel startup timed out."));
        }
      }, 15000);
    });
  }

  throw new Error(`Unknown tunnel service: ${service}`);
}

/**
 * Stops any active tunnels.
 */
export async function stopTunnel() {
  if (activeNgrok) {
    try {
      await ngrok.disconnect();
      await ngrok.kill();
    } catch {}
    activeNgrok = false;
  }

  if (activeTunnelProcess) {
    console.log("\n🛑 Closing tunnel...");
    try {
      activeTunnelProcess.kill("SIGTERM");
    } catch {}
    activeTunnelProcess = null;
    tunnelUrl = null;
    console.log("✅ Tunnel closed.");
  }
}
