// xUSDT MCP server: wallet link via WalletConnect + buy_nft on Plasma
import axios from 'axios';
import qrcode from 'qrcode-terminal';

// Optional: use MCP SDK if available; fall back to simple stdio JSON-RPC
let mcp;
try {
  mcp = await import('@modelcontextprotocol/sdk/server');
} catch (e) {
  mcp = null;
}

// WalletConnect v2 sign-client (lazy init)
let SignClient;
let wcClient = null;
let wcSession = null;
let wcAddress = null;
let wcNamespace = 'eip155';

async function ensureWC() {
  if (!SignClient) {
    ({ default: SignClient } = await import('@walletconnect/sign-client'));
  }
  if (!wcClient) {
    const projectId = process.env.WC_PROJECT_ID;
    if (!projectId) throw new Error('WC_PROJECT_ID is required');
    wcClient = await SignClient.init({ projectId });
  }
  return wcClient;
}

function sigToVRS(sigHex) {
  const s = sigHex.startsWith('0x') ? sigHex.slice(2) : sigHex;
  const r = '0x' + s.slice(0, 64);
  const sPart = '0x' + s.slice(64, 128);
  let v = parseInt(s.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s: sPart };
}

function buildEip3009TypedData({ tokenName, tokenVersion, chainId, verifyingContract, from, to, value, validAfter, validBefore, nonce32 }) {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    domain: {
      name: tokenName,
      version: tokenVersion,
      chainId,
      verifyingContract,
    },
    message: {
      from,
      to,
      value: Number(value),
      validAfter: Number(validAfter),
      validBefore: Number(validBefore),
      nonce: nonce32,
    },
  };
}

async function wallet_link_start() {
  await ensureWC();
  const requiredNamespaces = {
    [wcNamespace]: {
      methods: ['eth_signTypedData_v4'],
      chains: ['eip155:9745'],
      events: ['accountsChanged', 'chainChanged'],
    },
  };
  const { uri, approval } = await wcClient.connect({ requiredNamespaces });
  if (uri) {
    // Show QR in server logs; also return it so clients (Claude) can render it
    try { qrcode.generate(uri, { small: true }); } catch {}
  }
  // Do not await approval here; let client poll status
  approval
    .then((session) => {
      wcSession = session;
      const accounts = session.namespaces[wcNamespace]?.accounts || [];
      wcAddress = accounts[0]?.split(':')?.[2] || null;
    })
    .catch(() => {});
  return { uri };
}

async function wallet_link_status() {
  if (wcSession && wcAddress) {
    return { status: 'linked', address: wcAddress };
  }
  return { status: 'pending' };
}

async function get_wallet_address() {
  if (!wcAddress) throw new Error('wallet not linked');
  return { address: wcAddress };
}

async function buy_nft({ merchantUrl, sku }) {
  if (!wcAddress || !wcSession) throw new Error('wallet not linked');
  const base = merchantUrl || process.env.MERCHANT_URL || 'http://127.0.0.1:8000';
  // 1) Get invoice
  const prResp = await axios.get(`${base}/product/${encodeURIComponent(sku)}`, { validateStatus: () => true });
  if (prResp.status !== 402) throw new Error(`unexpected status ${prResp.status}`);
  const pr = prResp.data;
  const option = (pr.paymentOptions || []).find((o) => o.scheme === 'eip3009-transfer-with-auth');
  if (!option) throw new Error('no plasma eip3009 option');

  const from = wcAddress;
  const to = option.recipient;
  const chainId = Number(option.chainId);
  const token = option.token;
  const amount = option.amount;
  const nonce32 = option.nonce?.startsWith('0x') ? option.nonce : `0x${option.nonce}`;
  const now = Math.floor(Date.now() / 1000);
  const validAfter = now - 1;
  const validBefore = Number(option.deadline);

  const tokenName = process.env.USDT0_NAME || 'USDTe';
  const tokenVersion = process.env.USDT0_VERSION || '1';

  const typed = buildEip3009TypedData({
    tokenName,
    tokenVersion,
    chainId,
    verifyingContract: token,
    from,
    to,
    value: Number(amount),
    validAfter,
    validBefore,
    nonce32,
  });

  // 2) Request signature via WC
  const topic = wcSession.topic;
  const params = [from, JSON.stringify(typed)];
  const sigHex = await wcClient.request({ topic, chainId: 'eip155:9745', request: { method: 'eth_signTypedData_v4', params } });
  const { v, r, s } = sigToVRS(sigHex);

  // 3) Submit to merchant
  const submitted = {
    type: 'payment-submitted',
    invoiceId: pr.invoiceId,
    chosenOption: {
      network: 'plasma',
      chainId,
      token,
      amount: String(amount),
      from: from,
      to: to,
      nonce: nonce32,
      deadline: validBefore,
      validAfter: validAfter,
      validBefore: validBefore,
    },
    signature: { v, r, s },
    scheme: 'eip3009-transfer-with-auth',
  };

  const payResp = await axios.post(`${base}/pay`, submitted);
  return payResp.data;
}

// Minimal MCP server or fallback JSON-RPC stdio
async function start() {
  const tools = {
    'wallet_link_start': { run: wallet_link_start },
    'wallet_link_status': { run: wallet_link_status },
    'get_wallet_address': { run: get_wallet_address },
    'buy_nft': { run: buy_nft },
  };

  if (mcp && mcp.createServer) {
    // Using MCP SDK (API may change; adjust if needed)
    const server = mcp.createServer({ name: 'xusdt-mcp', version: '0.1.0' });
    server.tool('wallet_link_start', { inputSchema: { type: 'object', properties: {} } }, async () => ({ ...(await wallet_link_start()) }));
    server.tool('wallet_link_status', { inputSchema: { type: 'object', properties: {} } }, async () => ({ ...(await wallet_link_status()) }));
    server.tool('get_wallet_address', { inputSchema: { type: 'object', properties: {} } }, async () => ({ ...(await get_wallet_address()) }));
    server.tool('buy_nft', { inputSchema: { type: 'object', properties: { merchantUrl: { type: 'string' }, sku: { type: 'string' } }, required: ['sku'] } }, async (args) => ({ ...(await buy_nft(args)) }));
    await server.start();
    return;
  }

  // Fallback simple stdio JSON-RPC: { id, method, params }
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    let line;
    while ((line = buffer.indexOf('\n')) >= 0) {
      const raw = buffer.slice(0, line).trim();
      buffer = buffer.slice(line + 1);
      if (!raw) continue;
      try {
        const msg = JSON.parse(raw);
        const t = tools[msg.method];
        if (!t) {
          process.stdout.write(JSON.stringify({ id: msg.id, error: 'method_not_found' }) + '\n');
          continue;
        }
        const result = await t.run(msg.params || {});
        process.stdout.write(JSON.stringify({ id: msg.id, result }) + '\n');
      } catch (e) {
        process.stdout.write(JSON.stringify({ error: String(e && e.message || e) }) + '\n');
      }
    }
  });
}

start().catch((e) => { console.error(e); process.exit(1); });
