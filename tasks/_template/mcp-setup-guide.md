# MCP Spec-Search Server 설치 가이드 (사장님 작업)

**목적:** 03-PROMPTS.md·01-CLAUDE.md·04-SECURITY-WALL.md 등 정책 문서를 vector search → Codex-Orchestrator가 작업지시 작성 시 사양 자동 정합 검증. **사이클 절반 차단 목표.**

---

## 1순위: MCP filesystem server (Anthropic 공식)

가장 단순. 정책 문서들을 read-only로 Claude·Codex에 노출.

### 설치 (Windows)
```powershell
npx -y @modelcontextprotocol/server-filesystem C:\My_Project\Coesite\docs
```

### Claude Code 설정 (`~/.claude/settings.json` 또는 프로젝트별)
```json
{
  "mcpServers": {
    "coesite-docs": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\My_Project\\Coesite\\docs"]
    }
  }
}
```

### Codex 설정 (`~/.codex/config.toml`)
```toml
[mcp_servers.coesite-docs]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "C:\\My_Project\\Coesite\\docs"]
```

---

## 2순위: Vector search (더 강력)

`@modelcontextprotocol/server-everything` 또는 별도 vector DB(Chroma·Qdrant)와 통합. 사양 문서 임베딩 후 의미 기반 검색.

설치 복잡도 높음. 1순위가 효과 부족할 때만.

---

## 3순위: Codex test-gen plugin

Codex plugin marketplace에서 검색:
```bash
codex plugin list
codex plugin install <name>
```

현재 plugin 마켓에 test-gen 없으면 사장님이 직접 plugin 작성 또는 Codex 사용자 요청.

---

## 4순위: NestJS lifecycle linter (ESLint plugin)

```bash
pnpm add -D eslint-plugin-nestjs eslint-plugin-nestjs-typed
```

`.eslintrc.json`:
```json
{
  "extends": ["plugin:nestjs/recommended", "plugin:nestjs-typed/recommended"]
}
```

middleware·filter·interceptor 순서 오류 정적 검출. P1.2 같은 사고 사전 차단.

---

## 검증

설치 후 새 세션에서:
- Claude: "/mcp" 또는 mcp 도구 list 확인
- Codex: `codex exec "list available mcp tools"` 호출
- 사양 문서 검색 작동 확인

---

*사장님 작업 완료 후 Claude에 알리시면 새 방식으로 작업지시 작성 시작합니다.*
