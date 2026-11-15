class ContextGenCli < Formula
  desc "Senior Engineer AI context generator, entropy distiller & MCP server"
  homepage "https://github.com/yakkshit/context-gen-cli"
  url "https://registry.npmjs.org/context-gen-cli/-/context-gen-cli-1.3.7.tgz"
  sha256 "c8d3eae160a892e32837db3dcae515e843e5383fef52b8141940c8bcf8b6d59f"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "1.3.7")
  end
end
