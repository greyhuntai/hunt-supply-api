require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");

const app = express();
const PORT = process.env.PORT || 3000;
const RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";

const TOKEN_CONTRACT = "0x0981209bd6a8b2439271156f73c1a7722f1c1347";

const NON_CIRCULATING_WALLETS = [
  { address: "0x07e987D16dBcE0f0Bdc89F79C9B4d40058397a7c", label: "Airdrop" },
  { address: "0xd5185f4D82BCBAeFECFF82f71E851222B61dcb84", label: "Airdrop Vesting" },
  { address: "0xD4E923ecacDAa31b8457C537aeDbBb581AD0FBcb", label: "Community Incentives" },
  { address: "0x2EA9f21038Df4d75756126B6751e8754868A6BFC", label: "Community Incentives Vesting" },
  { address: "0xB1b2f047F6E016B343A5558b9d7d108d033D19f0", label: "Foundation" },
  { address: "0x986c8275de9E689D0276630C1EB7fC7d6645115d", label: "Foundation Vesting" },
  { address: "0x461551A085e550c643f305A43399a0A24138211B", label: "Team" },
  { address: "0x79DfD8f61b4F7DD0F1943FdF7245eB63E06E7D5c", label: "Team Vesting" },
  { address: "0x29d340ce2a57F6729ed7Ad615ED6722AC82ed04f", label: "Investor" },
  { address: "0x44904e35f4dbCe6dA2A191096d1e284487743D14", label: "Investor Vesting" },
  { address: "0x29Ac6bcA17A40f4dA704f99C436b68cc3458548F", label: "Deployer" },
];

const BURN_ADDRESSES = [
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dEaD",
];

const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const tokenContract = new ethers.Contract(TOKEN_CONTRACT, ERC20_ABI, provider);

let cache = { totalSupply: null, circulatingSupply: null, nonCirculatingBalances: null, decimals: null, lastUpdated: null };
const CACHE_TTL = 5 * 60 * 1000;

function isCacheValid() {
  return cache.lastUpdated && Date.now() - cache.lastUpdated < CACHE_TTL;
}

async function fetchSupplyData() {
  if (isCacheValid()) return cache;
  if (!cache.decimals) cache.decimals = await tokenContract.decimals();
  const rawTotalSupply = await tokenContract.totalSupply();
  const burnBalances = await Promise.all(BURN_ADDRESSES.map((addr) => tokenContract.balanceOf(addr)));
  const totalBurned = burnBalances.reduce((sum, bal) => sum + bal, 0n);
  const totalSupply = rawTotalSupply - totalBurned;
  const balanceResults = await Promise.all(
    NON_CIRCULATING_WALLETS.map(async (wallet) => {
      const balance = await tokenContract.balanceOf(wallet.address);
      return { ...wallet, balance };
    })
  );
  const totalNonCirculating = balanceResults.reduce((sum, w) => sum + w.balance, 0n);
  const circulatingSupply = totalSupply - totalNonCirculating;
  const decimals = Number(cache.decimals);
  cache = {
    totalSupply: ethers.formatUnits(totalSupply, decimals),
    circulatingSupply: ethers.formatUnits(circulatingSupply, decimals),
    nonCirculatingBalances: balanceResults.map((w) => ({
      label: w.label, address: w.address, balance: ethers.formatUnits(w.balance, decimals),
    })),
    decimals,
    lastUpdated: Date.now(),
  };
  return cache;
}

app.get("/total-supply", async (req, res) => {
  try {
    const data = await fetchSupplyData();
    res.set("Content-Type", "application/json");
    res.send(data.totalSupply);
  } catch (err) {
    console.error("Error fetching total supply:", err.message);
    res.status(500).json({ error: "Failed to fetch total supply" });
  }
});

app.get("/circulating-supply", async (req, res) => {
  try {
    const data = await fetchSupplyData();
    res.set("Content-Type", "application/json");
    res.send(data.circulatingSupply);
  } catch (err) {
    console.error("Error fetching circulating supply:", err.message);
    res.status(500).json({ error: "Failed to fetch circulating supply" });
  }
});

app.get("/supply", async (req, res) => {
  try {
    const data = await fetchSupplyData();
    res.json({
      token: "HUNT", chain: "Base", contract: TOKEN_CONTRACT,
      totalSupply: data.totalSupply, circulatingSupply: data.circulatingSupply,
      nonCirculatingWallets: data.nonCirculatingBalances,
      lastUpdated: new Date(data.lastUpdated).toISOString(),
    });
  } catch (err) {
    console.error("Error fetching supply details:", err.message);
    res.status(500).json({ error: "Failed to fetch supply data" });
  }
});

app.get("/", (req, res) => {
  res.json({
    name: "HUNT Token Supply API",
    endpoints: { totalSupply: "/total-supply", circulatingSupply: "/circulating-supply", details: "/supply" },
  });
});

app.listen(PORT, () => {
  console.log("HUNT Supply API running on port " + PORT);
});
