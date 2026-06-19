// tiny markdown renderer for the legal pages — keeps docs/*.md as the single
// source of truth without pulling in a markdown dependency.
// supports: #/##/### headings, - lists, ---, paragraphs, **bold**.
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

export function loadDoc(name: string): string {
  const candidates = [
    path.join(process.cwd(), '..', '..', 'docs', name), // run from apps/web
    path.join(process.cwd(), 'docs', name), // run from repo root
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch {
      // keep trying
    }
  }
  return `# document missing\n\nwe couldn't load ${name}. write to nehachhillar07@gmail.com and we'll send it to you.`;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyBase}-${i}`}>{part}</strong> : <span key={`${keyBase}-${i}`}>{part}</span>,
  );
}

export function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {list.map((item, i) => (
          <li key={i}>{inline(item, `li-${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ');
    out.push(<p key={`p-${key++}`}>{inline(text, `p-${key}`)}</p>);
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('### ')) {
      flushList();
      flushPara();
      out.push(<h3 key={`h3-${key++}`}>{inline(line.slice(4), `h3-${key}`)}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      flushPara();
      out.push(<h2 key={`h2-${key++}`}>{inline(line.slice(3), `h2-${key}`)}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      flushPara();
      out.push(<h1 key={`h1-${key++}`}>{inline(line.slice(2), `h1-${key}`)}</h1>);
    } else if (line.startsWith('- ')) {
      flushPara();
      list.push(line.slice(2));
    } else if (/^\d+\. /.test(line)) {
      flushPara();
      list.push(line.replace(/^\d+\. /, ''));
    } else if (line === '---') {
      flushList();
      flushPara();
      out.push(<hr key={`hr-${key++}`} />);
    } else if (line.trim() === '') {
      flushList();
      flushPara();
    } else {
      para.push(line.trim());
    }
  }
  flushList();
  flushPara();
  return out;
}
