import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

import { useCallback, useEffect, useState } from "react";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  phatomEnvironment,
  solonaKey,
  solonaNetworkUrl,
  tokenSymbolName,
  walletPublicKeyGlobally,
} from "../helpers";

import { toast } from "react-toastify";

const Content = () => {
  const [lamports, setLamports] = useState(0.001);
  const [tokenBalances, setTokenBalances] = useState([]);
  const [solBalance, setSolBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tokenSymbol, setTokenSymbol] = useState(tokenSymbolName);
  const [walletPublicKey, setWalletPublicKey] = useState(
    walletPublicKeyGlobally
  );
  const [tokenAddress, setTokenAddress] = useState(null);
  const connection = new Connection(clusterApiUrl(phatomEnvironment));
  const { publicKey, sendTransaction } = useWallet();

  const sendSolHandler = useCallback(async () => {
    // Function to send SOL
    try {
      if (!publicKey) {
        toast.error("Wallet Not connected");
        return;
      }

      setLoading(true);

      const balance = await connection.getBalance(publicKey);

      let lamportsI = LAMPORTS_PER_SOL * lamports;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(walletPublicKey),
          lamports: lamportsI,
        })
      );

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, "processed");

      toast.success("Transaction Successful");
      setTheLamports("");
      fetchSolBalance();
      setLoading(false);
    } catch (error) {
      toast.error("Error: " + error?.message);
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, lamports, walletPublicKey]);

  const setTheLamports = (e) => {
    // Function to set Lamports
    const { value } = e.target ?? {};
    setLamports(Number(value));
  };

  const fetchSolBalance = async () => {
    // Function to fetch SOL balance
    if (!publicKey) {
      return;
    }

    const balanceInLamports = await connection.getBalance(publicKey);
    const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;

    setSolBalance(balanceInSol);
  };

  // Function to fetch token balances
  const fetchTokenBalances = async () => {
    // Check if a publicKey is available
    if (!publicKey) {
      return; // If not, exit the function
    }

    // Fetch token accounts associated with the publicKey
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Use Promise.all to asynchronously fetch balances for each token account
    const balances = await Promise.all(
      tokenAccounts.value.map(async (accountInfo) => {
        // Create a PublicKey object for the token account
        const publicKey = new PublicKey(accountInfo.pubkey);

        // Create a Token object using the connection, publicKey, and TOKEN_PROGRAM_ID
        const token = new Token(connection, publicKey, TOKEN_PROGRAM_ID);

        // Get the balance for the token account
        const balance = await token.getBalance(publicKey);

        // Find the symbol associated with this token account
        const symbol = tokenAddress[publicKey.toBase58()];

        // Return an object containing publicKey, balance, and symbol
        return { publicKey, balance, symbol };
      })
    );

    // Set the token balances in the state or perform any other desired action
    setTokenBalances(balances);
  };

  const getTokenAddress = async () => {
    // Function to get token address
    try {
      const connection = new Connection(solonaNetworkUrl, "singleGossip");

      const tokenList = await connection.getTokenAccountsByOwner(
        new PublicKey(walletPublicKey),
        {
          programId: new PublicKey(solonaKey),
        }
      );

      const filteredTokens = tokenList.value.filter(
        (token) => token.account.data.parsed.info.symbol === tokenSymbol
      );

      if (filteredTokens.length === 0) {
        toast.error(`No tokens found with symbol ${tokenSymbol}`);
      } else {
        setTokenAddress(filteredTokens[0].pubkey.toString());
      }
    } catch (error) {
      toast.error("Error: " + error?.message);
    }
  };

  useEffect(() => {
    getTokenAddress();
  }, [tokenSymbol, walletPublicKey]);

  useEffect(() => {
    fetchTokenBalances();
    fetchSolBalance();
  }, [publicKey]);

  return (
    <div className="App">
      <header className="navbar">
        <nav className="navbar-inner">
          <ul className="nav"></ul>
          <ul className="nav pull-right">
            <li>
              <a href="#" className="nav-link">
                White Paper
              </a>
            </li>
            <li className="divider-vertical"></li>
            <li>
              <WalletMultiButton />
            </li>
          </ul>
        </nav>
      </header>
      <div className="dashboard">
        <div className="balance">
          <h2>Your Balance:</h2>
          <p className="balance-amount">{solBalance || 0} SOL</p>
        </div>
        <div className="content">
          <input
            value={lamports}
            type="number"
            onChange={(e) => setTheLamports(e)}
            placeholder="Enter Lamports"
            className="input-field"
          />
          <br />
          <button
            className="btn send-button"
            disabled={loading}
            onClick={sendSolHandler}
          >
            {loading ? "Sending..." : "Send SOL"}
          </button>
        </div>
      </div>
      <div className="token-balances">
        <h2>Your Token Balances:</h2>
        <ul>
          {tokenBalances?.map((tokenBalance) => (
            <li key={tokenBalance?.publicKey?.toBase58()}>
              {tokenBalance?.symbol}: {tokenBalance?.balance?.toString()} tokens
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Content;
