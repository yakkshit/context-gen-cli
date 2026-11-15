# context-gen-cli (Java Edition)

⚡ **Enterprise-grade project context generator and Entropy-Guided Reference Distillation (EGRD) CLI.**

Stop dumping 50,000 raw prompt tokens into Claude, Cursor, and ChatGPT. `context-gen-cli` extracts architectural graphs, module dependencies, and precision blueprints for JVM and polyglot codebases in 1-2 CPU cores with zero GPU bloat.

## Quick Run

### Run directly with JBang (Zero manual installation):
```bash
jbang com.cedzlabs.java.ctx:context-gen-cli:1.3.5
```

### Build & Run Executable Fat JAR:
```bash
# Package into executable JAR
mvn clean package

# Run CLI
java -jar target/context-gen-cli-1.3.5-all.jar --help
java -jar target/context-gen-cli-1.3.5-all.jar --distill "Refactor payment processor service"
```

## Publishing to Maven Central

1. **Prerequisites:**
   - Account on [Sonatype Central Portal](https://central.sonatype.com).
   - Valid GPG key (`gpg --gen-key`).
   - Token configured in `~/.m2/settings.xml` under `<server><id>central</id>`.

2. **Publish Command:**
```bash
mvn clean deploy -P release
```

