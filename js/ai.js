/* ============================================================
 * AI 战术助手 —— 右下角悬浮球 + 对话弹窗
 * 接入：阿里云百炼 DashScope（OpenAI 兼容模式，通义千问）
 * ============================================================ */

const AIChat = (() => {
  /* ======== 配置区：阿里云百炼 DashScope ======== */
  const API_KEY = 'sk-ws-H.PIHYXXI.yiBG.MEUCIQDZ7cWw625UpMdI6phbuVRn4Ya2aM_dSFgRu_IGjkNDJQIge-6s1MLwVMIIoScfTZKToVYttFJWZLse80h7IloEf5M';
  const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const MODEL = 'qwen-plus';

  const QUICK_ASKS = ['这把枪怎么压枪？', '帮我推荐配件搭配', 'M416和AKM哪个更强？', '决赛圈有什么技巧？'];

  let panel, msgList, inputEl, sendBtn, chatBtn, clearBtn, closeBtn;
  let history = [];          // {role, content}
  let controller = null;     // 中断用
  let busy = false;
  let unread = false;

  /* ---------- 系统提示词（含当前枪械上下文） ---------- */
  function buildSystemPrompt() {
    let sys = '你是《和平精英》资深战术助手"小金"，精通全部枪械数据、配件搭配、压枪技巧、地图点位与战术策略。' +
      '回答使用简体中文，口语化、简洁专业，默认不超过200字；用户要求详解时可展开。' +
      '适当使用 emoji 让对话更轻松。';
    if (window.APP_STATE && window.APP_STATE.currentGun) {
      const g = window.APP_STATE.currentGun;
      sys += `\n【当前场景】用户刚随机抽中的枪械是「${g.name}（${g.en}）」，类型：${g.type}，弹药：${g.ammo}，` +
        `伤害${g.stats.dmg}，弹容${g.mag}。${g.desc}如果用户的问题没有指明枪械，默认围绕这把枪回答。`;
    }
    return sys;
  }

  /* ---------- 初始化 UI ---------- */
  function init() {
    /* 悬浮球 */
    chatBtn = document.createElement('button');
    chatBtn.id = 'ai-fab';
    chatBtn.title = 'AI 战术助手';
    chatBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="7" width="16" height="12" rx="3"/>
        <circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none"/>
        <path d="M12 7V4M8 4h8"/>
        <path d="M12 19v2"/>
      </svg>
      <span class="ai-fab-badge" hidden>1</span>`;
    document.body.appendChild(chatBtn);

    /* 弹窗 */
    panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-header">
        <div class="ai-header-left">
          <div class="ai-avatar">AI</div>
          <div>
            <div class="ai-title">AI 战术助手</div>
            <div class="ai-sub">通义千问 · 在线</div>
          </div>
        </div>
        <div class="ai-header-btns">
          <button class="ai-icon-btn" id="ai-clear" title="清空对话">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2m-9 0v13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6"/></svg>
          </button>
          <button class="ai-icon-btn" id="ai-close" title="收起">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </div>
      <div class="ai-messages" id="ai-messages">
        <div class="ai-welcome">
          <div class="ai-welcome-title">交个朋友，我是小金</div>
          <div class="ai-welcome-text">我知道每把枪的脾气，可以帮你分析刚抽到的枪、推荐配件、聊聊压枪和打法。</div>
        </div>
      </div>
      <div class="ai-quick" id="ai-quick"></div>
      <div class="ai-input-row">
        <input id="ai-input" type="text" placeholder="问我任何和平精英的问题…" maxlength="500" />
        <button id="ai-send" title="发送">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </div>`;
    document.body.appendChild(panel);

    msgList = panel.querySelector('#ai-messages');
    inputEl = panel.querySelector('#ai-input');
    sendBtn = panel.querySelector('#ai-send');
    clearBtn = panel.querySelector('#ai-clear');
    closeBtn = panel.querySelector('#ai-close');
    const quickWrap = panel.querySelector('#ai-quick');
    QUICK_ASKS.forEach(q => {
      const chip = document.createElement('button');
      chip.className = 'ai-quick-chip';
      chip.textContent = q;
      chip.addEventListener('click', () => { inputEl.value = q; send(); });
      quickWrap.appendChild(chip);
    });

    chatBtn.addEventListener('click', toggle);
    closeBtn.addEventListener('click', () => toggle(false));
    clearBtn.addEventListener('click', clearChat);
    sendBtn.addEventListener('click', () => send());
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  function toggle(force) {
    const show = force !== undefined ? force : !panel.classList.contains('open');
    panel.classList.toggle('open', show);
    chatBtn.classList.toggle('hidden', show);
    if (show) {
      unread = false;
      chatBtn.querySelector('.ai-fab-badge').hidden = true;
      setTimeout(() => inputEl.focus(), 250);
    }
  }

  function clearChat() {
    if (controller) { controller.abort(); controller = null; }
    history = [];
    busy = false;
    msgList.innerHTML = `
      <div class="ai-welcome">
        <div class="ai-welcome-title">交个朋友，我是小金</div>
        <div class="ai-welcome-text">我知道每把枪的脾气，可以帮你分析刚抽到的枪、推荐配件、聊聊压枪和打法。</div>
      </div>`;
    restoreQuick(true);
  }

  function restoreQuick(show) {
    panel.querySelector('#ai-quick').style.display = show ? 'flex' : 'none';
  }

  /* ---------- 消息气泡 ---------- */
  function addMsg(role, html) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-bot');
    const avatar = role === 'user' ? '<div class="ai-msg-avatar user">我</div>' : '<div class="ai-msg-avatar">AI</div>';
    div.innerHTML = `${role === 'user' ? '' : avatar}<div class="ai-bubble">${html}</div>${role === 'user' ? avatar : ''}`;
    msgList.appendChild(div);
    msgList.scrollTop = msgList.scrollHeight;
    return div.querySelector('.ai-bubble');
  }

  function typingBubble() {
    const b = addMsg('assistant', '<span class="ai-typing"><i></i><i></i><i></i></span>');
    return b;
  }

  function mdLite(text) {
    let s = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return s;
  }

  /* ---------- 发送与流式请求 ---------- */
  async function send() {
    const text = inputEl.value.trim();
    if (!text || busy) return;
    inputEl.value = '';
    restoreQuick(false);
    addMsg('user', mdLite(text));
    history.push({ role: 'user', content: text });

    const bubble = typingBubble();
    busy = true;
    sendBtn.classList.add('loading');
    controller = new AbortController();

    try {
      const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history.slice(-12)];
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: MODEL, messages, stream: true }),
        signal: controller.signal
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err.error && err.error.message ? err.error.message : errMsg;
        } catch (e) { /* ignore */ }
        throw new Error(errMsg);
      }

      /* 解析 SSE 流 */
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '', full = '';
      bubble.innerHTML = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices && json.choices[0] && json.choices[0].delta;
            if (delta && delta.content) {
              full += delta.content;
              bubble.innerHTML = mdLite(full);
              msgList.scrollTop = msgList.scrollHeight;
            }
          } catch (e) { /* 跳过不完整片段 */ }
        }
      }
      if (!full) full = '（AI 没有返回内容，请重试）';
      history.push({ role: 'assistant', content: full });
      if (history.length > 24) history = history.slice(-24);
    } catch (err) {
      if (err.name === 'AbortError') {
        bubble.innerHTML = '<span style="opacity:.6">（已停止生成）</span>';
      } else {
        const hint = /401|403|InvalidApiKey|Unauthorized/i.test(err.message)
          ? 'API 密钥无效或已过期，请检查 AIChat 中的密钥配置。'
          : (/Failed to fetch|NetworkError/i.test(err.message)
            ? '网络连接失败，请检查网络后重试。'
            : err.message);
        bubble.innerHTML = `<span style="color:#ff7d7d">出错了：${hint}</span><br><span style="opacity:.6;font-size:12px">点击输入框重新发送即可重试。</span>`;
        history.pop();
      }
    } finally {
      busy = false;
      sendBtn.classList.remove('loading');
      controller = null;
      msgList.scrollTop = msgList.scrollHeight;
    }
  }

  /* 抽中新枪时让悬浮球亮一下提醒可以问 AI */
  function notifyNewGun(gun) {
    if (panel.classList.contains('open')) return;
    unread = true;
    const badge = chatBtn.querySelector('.ai-fab-badge');
    badge.hidden = false;
    badge.textContent = '!';
  }

  return { init, notifyNewGun };
})();
