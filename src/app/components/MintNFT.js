"use client"
import { useState } from 'react';
import { Keypair } from '@solana/web3.js';
import { mintNFT, getTransactionUrl } from '../lib/solana';

const MintNFT = ({ wallet }) => {
    const [minting, setMinting] = useState(false);
    const [error, setError] = useState('');
    const [txSignature, setTxSignature] = useState('');

    const handleMint = async () => {
        if (!wallet) {
            setError('Please connect your wallet first');
            return;
        }

        setMinting(true);
        setError('');
        setTxSignature('');

        try {
            // Create new mint keypair for the NFT
            const mintKeypair = Keypair.generate();
            
            const signature = await mintNFT(
                wallet,
                mintKeypair,
                wallet // Use connected wallet as mint authority
            );
            
            setTxSignature(signature);
        } catch (err) {
            console.error('Minting error:', err);
            setError(err.message || 'Failed to mint NFT');
        } finally {
            setMinting(false);
        }
    };

    if (!wallet) {
        return (
            <div className="text-center text-slate-400">
                Please connect your wallet to mint NFTs
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">Mint Your NFT</h2>
                <p className="text-slate-400">Cost: 1 SOL</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm w-full">
                    {error}
                </div>
            )}

            {txSignature && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-lg text-sm w-full">
                    Successfully minted! View on{' '}
                    <a
                        href={getTransactionUrl(txSignature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        Solana Explorer
                    </a>
                </div>
            )}

            <button
                onClick={handleMint}
                disabled={minting}
                className={`bg-gradient-to-r from-purple-600 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 w-full ${
                    minting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
                {minting ? 'Minting...' : 'Mint NFT (1 SOL)'}
            </button>
        </div>
    );
};

export default MintNFT;