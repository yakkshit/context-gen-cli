class ContextGenCli < Formula
  desc "Senior Engineer AI context generator, entropy distiller & MCP server"
  homepage "https://github.com/yakkshit/context-gen-cli"
  url "https://registry.npmjs.org/context-gen-cli/-/context-gen-cli-1.3.0.tgz"
  sha256 "PENDING_FIRST_PUBLISH"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "1.3.0", shell_output("#{bin}/ctx --version")
  end
end
