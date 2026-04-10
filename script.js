const inputEl = document.getElementById('inputText');
const outputEl = document.getElementById('outputBody');
const charCountEl = document.getElementById('charCount');
const btn = document.getElementById('summarizeBtn');
const errorEl = document.getElementById('errorMsg');
const copyBtn = document.getElementById('copyBtn');
const apiKeyEl = document.getElementById('apiKey');
const toggleEye = document.getElementById('toggleEye');
const statusDot = document.getElementById('statusDot');

const MODEL = 'facebook/bart-large-cnn';
let activeLen = 'short';

const lengthParams = {
  short:  { min_length: 30,  max_length: 80  },
  medium: { min_length: 60,  max_length: 150 },
  long:   { min_length: 100, max_length: 250 },
};

inputEl.addEventListener('input', () => {
  charCountEl.textContent = inputEl.value.length.toLocaleString() + ' chars';
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeLen = chip.dataset.len;
  });
});

toggleEye.addEventListener('click', () => {
  const hidden = apiKeyEl.type === 'password';
  apiKeyEl.type = hidden ? 'text' : 'password';
  toggleEye.textContent = hidden ? 'hide' : 'show';
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(outputEl.innerText).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 1800);
  });
});

btn.addEventListener('click', async () => {
  const token = apiKeyEl.value.trim();
  const text = inputEl.value.trim();

  errorEl.classList.remove('visible');

  if (!token) {
    showError('Please enter your Hugging Face token above.');
    apiKeyEl.focus();
    return;
  }

  if (!token.startsWith('hf_')) {
    showError('Token should start with "hf_" — check your Hugging Face access token.');
    return;
  }

  if (!text) {
    showError('Please enter some text to summarize.');
    inputEl.focus();
    return;
  }

  if (text.split(/\s+/).length < 20) {
    showError('Text is too short — please paste at least a paragraph.');
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');
  outputEl.innerHTML = '<p class="output-placeholder">Summarizing\u2026 this may take a few seconds on first run.</p>';
  copyBtn.style.display = 'none';
  statusDot.style.display = 'none';

  const params = lengthParams[activeLen];

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          min_length: params.min_length,
          max_length: params.max_length,
          do_sample: false
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error || `API error ${res.status}`;
      if (msg.toLowerCase().includes('loading')) {
        throw new Error('Model is loading on HF servers \u2014 wait 20 seconds and try again.');
      }
      throw new Error(msg);
    }

    if (Array.isArray(data) && data[0]?.error?.includes('loading')) {
      throw new Error('Model is loading \u2014 wait 20 seconds and try again.');
    }

    const summary = Array.isArray(data) ? data[0]?.summary_text : data?.summary_text;
    if (!summary) {
      throw new Error('No summary returned. The model may still be loading \u2014 please try again in 20 seconds.');
    }

    outputEl.innerHTML = `<p style="color:var(--ink);line-height:1.75">${summary}</p>`;
    copyBtn.style.display = 'block';
    statusDot.style.display = 'inline-block';

  } catch (err) {
    outputEl.innerHTML = '<p class="output-placeholder">Could not generate summary.</p>';
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}