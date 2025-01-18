"use client"
import { useState, useEffect } from 'react';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { connection, confirmTransaction, getTransactionUrl } from './lib/solana';
import WalletConnect from './components/WalletConnect';
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createMintToInstruction,
    getMint
} from '@solana/spl-token';
import { IDL } from './lib/idl';

export default function Home() {
    const [walletAddress, setWalletAddress] = useState(null);
    const [multiplier, setMultiplier] = useState(1);
    const [statusMessage, setStatusMessage] = useState('');
    const [selectedNFT, setSelectedNFT] = useState(null);
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState(null);
    const [program, setProgram] = useState(null);

    useEffect(() => {
        if (window.solana && walletAddress) {
            try {
                const newProvider = new AnchorProvider(
                    connection,
                    window.solana,
                    { commitment: 'confirmed' }
                );
                setProvider(newProvider);

                const programId = new web3.PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID);
                const program = new Program(IDL, programId, newProvider);
                setProgram(program);
            } catch (error) {
                console.error('Error initializing program:', error);
                setStatusMessage('Failed to initialize program. Check console for details.');
            }
        }
    }, [walletAddress]);

    const onConnect = (address) => {
        setWalletAddress(address);
        setStatusMessage('');
    };

    const createMintAndTokenAccounts = async () => {
        if (!provider) throw new Error('Provider not initialized');

        // Generate NFT mint keypair
        const nftMint = web3.Keypair.generate();
        
        // Create instructions array
        const instructions = [];

        // Create mint account
        const mintRent = await connection.getMinimumBalanceForRentExemption(82);
        instructions.push(
            web3.SystemProgram.createAccount({
                fromPubkey: provider.wallet.publicKey,
                newAccountPubkey: nftMint.publicKey,
                space: 82,
                lamports: mintRent,
                programId: TOKEN_PROGRAM_ID,
            })
        );

        // Initialize mint
        instructions.push(
            createInitializeMintInstruction(
                nftMint.publicKey,
                0,
                provider.wallet.publicKey,
                provider.wallet.publicKey,
                TOKEN_PROGRAM_ID
            )
        );

        // Get associated token account for NFT
        const nftTokenAccount = await getAssociatedTokenAddress(
            nftMint.publicKey,
            provider.wallet.publicKey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        // Create NFT token account
        instructions.push(
            createAssociatedTokenAccountInstruction(
                provider.wallet.publicKey,
                nftTokenAccount,
                provider.wallet.publicKey,
                nftMint.publicKey,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );

        return { nftMint, nftTokenAccount, instructions };
    };

    const mintNFT = async () => {
        if (!walletAddress || !provider || !program) {
            setStatusMessage('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setStatusMessage('Initializing mint...');

        try {
            // Create mint and token accounts
            const { nftMint, nftTokenAccount, instructions } = await createMintAndTokenAccounts();
            const tokenVault = web3.Keypair.generate();

            // Find PDAs
            const [paymentVault] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("payment_vault")],
                program.programId
            );
            const [nftMintState] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("nft_mint_state")],
                program.programId
            );

            setStatusMessage('Creating token accounts...');

            const capyTokenMint = new web3.PublicKey(process.env.NEXT_PUBLIC_CAPY_TOKEN_MINT);
            const vaultTokenAccount = await getAssociatedTokenAddress(
                capyTokenMint,
                tokenVault.publicKey,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            // Add vault token account creation
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    provider.wallet.publicKey,
                    vaultTokenAccount,
                    tokenVault.publicKey,
                    capyTokenMint,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );

            setStatusMessage('Building transaction...');

            // Build the transaction
            const tx = await program.methods.mintNft(multiplier)
                .accounts({
                    payer: provider.wallet.publicKey,
                    mintPass: new web3.PublicKey('2Y52hkgnn4UQZWy1pCEoYgSoimvoaTy5gAAzAvZRfLfa'),
                    paymentVault,
                    nftMint: nftMint.publicKey,
                    nftTokenAccount,
                    tokenVault: tokenVault.publicKey,
                    vaultTokenAccount,
                    capyTokenMint,
                    nftMintState,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    systemProgram: web3.SystemProgram.programId,
                    rent: web3.SYSVAR_RENT_PUBKEY,
                })
                .preInstructions(instructions)
                .signers([nftMint, tokenVault])
                .rpc({ commitment: 'confirmed' });

            await confirmTransaction(tx);

            const explorerUrl = getTransactionUrl(tx);
            setSelectedNFT(nftMint.publicKey.toString());
            setStatusMessage(`
Mint Successful! 🎉
NFT Address: ${nftMint.publicKey.toString()}
Transaction: ${explorerUrl}
            `);
        } catch (error) {
            console.error('Mint error:', error);
            let errorMessage = error.message;
            if (error.logs) {
                errorMessage += '\n\nLogs:\n' + error.logs.join('\n');
            }
            setStatusMessage(`Mint failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const unlockTokens = async () => {
        if (!selectedNFT || !provider || !program) {
            setStatusMessage('Please mint an NFT first');
            return;
        }

        setLoading(true);
        setStatusMessage('Initializing token unlock...');

        try {
            const [tokenVault] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("token_vault"), new web3.PublicKey(selectedNFT).toBuffer()],
                program.programId
            );

            const capyTokenMint = new web3.PublicKey(process.env.NEXT_PUBLIC_CAPY_TOKEN_MINT);
            
            // Get token accounts
            const vaultTokenAccount = await getAssociatedTokenAddress(
                capyTokenMint,
                tokenVault,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const recipientTokenAccount = await getAssociatedTokenAddress(
                capyTokenMint,
                provider.wallet.publicKey,
                true,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            setStatusMessage('Sending unlock transaction...');

            const tx = await program.methods.unlockTokens()
                .accounts({
                    owner: provider.wallet.publicKey,
                    tokenVault,
                    vaultTokenAccount,
                    recipientTokenAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc({ commitment: 'confirmed' });

            await confirmTransaction(tx);

            const explorerUrl = getTransactionUrl(tx);
            setStatusMessage(`
Tokens Unlocked Successfully! 🎉
Transaction: ${explorerUrl}
            `);
        } catch (error) {
            console.error('Unlock error:', error);
            let errorMessage = error.message;
            if (error.logs) {
                errorMessage += '\n\nLogs:\n' + error.logs.join('\n');
            }
            setStatusMessage(`Unlock failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent">
                    Token-Bounded NFT Minting
                </h1>
                
                <div className="bg-slate-800 rounded-lg p-6 mb-8 shadow-xl">
                    <WalletConnect onConnect={onConnect} />
                </div>

                {walletAddress && (
                    <div className="bg-slate-800 rounded-lg p-6 mb-8 shadow-xl">
                        <h2 className="text-2xl font-semibold mb-4">Mint NFT</h2>
                        <div className="flex gap-4 mb-4">
                            <input 
                                type="number" 
                                value={multiplier} 
                                onChange={(e) => setMultiplier(Math.max(1, Math.min(255, parseInt(e.target.value) || 1)))} 
                                min="1"
                                max="255"
                                className="bg-slate-700 rounded px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-orange-500"
                                placeholder="Reward Multiplier (1-255)" 
                                disabled={loading}
                            />
                            <button 
                                onClick={mintNFT} 
                                disabled={loading}
                                className={`bg-gradient-to-r from-orange-500 to-purple-600 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity ${
                                    loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? 'Processing...' : 'Mint NFT'}
                            </button>
                        </div>
                    </div>
                )}

                {selectedNFT && (
                    <div className="bg-slate-800 rounded-lg p-6 mb-8 shadow-xl">
                        <h2 className="text-2xl font-semibold mb-4">Unlock Tokens</h2>
                        <div className="flex gap-4 mb-4">
                            <input 
                                type="text" 
                                value={selectedNFT} 
                                readOnly 
                                className="bg-slate-700 rounded px-4 py-2 w-full font-mono text-sm"
                            />
                            <button 
                                onClick={unlockTokens}
                                disabled={loading}
                                className={`bg-gradient-to-r from-orange-500 to-purple-600 px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity ${
                                    loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {loading ? 'Processing...' : 'Unlock'}
                            </button>
                        </div>
                    </div>
                )}

                {statusMessage && (
                    <div className="bg-slate-800 rounded-lg p-4 mt-4">
                        <pre className="whitespace-pre-wrap break-words text-sm font-mono text-slate-300">
                            {statusMessage}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}