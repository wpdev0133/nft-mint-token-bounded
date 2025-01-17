"use client"
import { useState } from 'react';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { connection } from './lib/solana';
import WalletConnect from './components/WalletConnect';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { IDL } from './lib/idl'; // Import your IDL
import BN from 'bn.js'; // Import BN from bn.js

const programID = new web3.PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID); // Use the environment variable

export default function Home() {
    const [walletAddress, setWalletAddress] = useState(null);
    const [multiplier, setMultiplier] = useState(1);
    const [statusMessage, setStatusMessage] = useState('');

    const onConnect = (address) => {
        setWalletAddress(address);
    };

    const mintNFT = async () => {
        if (!walletAddress) {
            setStatusMessage('Please connect your wallet first.');
            return;
        }
        setStatusMessage('Minting...');

        const provider = new AnchorProvider(connection, window.solana, {});
        const program = new Program(IDL, programID, provider); // Initialize program
        const nftAccount = web3.Keypair.generate(); // Generate a new keypair for the NFT account
        
        try {
            const tx = await program.rpc.mintNft(new BN(multiplier), {
                accounts: {
                    payer: provider.wallet.publicKey,
                    mintPass: '2Y52hkgnn4UQZWy1pCEoYgSoimvoaTy5gAAzAvZRfLfa', // Replace with actual address
                    nftAccount: nftAccount.publicKey,
                    recipientTokenAccount: '2Y52hkgnn4UQZWy1pCEoYgSoimvoaTy5gAAzAvZRfLfa', // Replace with actual address
                    capyTokenMint: 'DH5UNzS8cqzkQjydAVNLcNpqR9D2PQQMXwTz8ZD1jfbj', // Replace with actual mint address for the $CAPY token
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: web3.SystemProgram.programId,
                },
                signers: [nftAccount], // Sign the transaction with the nftAccount Keypair
            });

            setStatusMessage(`Transaction successful! Signature: ${tx}`);
        } catch (error) {
            setStatusMessage(`Transaction failed: ${error.message}`);
        }
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Solana Token-Bounded NFT Minting DApp</h1>
            <WalletConnect onConnect={onConnect} />
            <input 
                type="number" 
                value={multiplier} 
                onChange={(e) => setMultiplier(e.target.value)} 
                placeholder="Multiplier" 
                style={styles.input} 
            />
            <button onClick={mintNFT} style={styles.button}>Mint NFT</button>
            {statusMessage && <p style={styles.status}>{statusMessage}</p>}
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f4f8',
        fontFamily: 'Arial, sans-serif',
    },
    title: {
        fontSize: '2rem',
        marginBottom: '20px',
    },
    input: {
        padding: '10px',
        margin: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1rem',
    },
    button: {
        padding: '10px 20px',
        margin: '10px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: '#0070f3',
        color: 'white',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    status: {
        marginTop: '20px',
        fontSize: '1rem',
        color: 'red',
    },
};