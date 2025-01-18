"use client"
import { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import MintNFT from './components/MintNFT';

export default function Home() {
    const [wallet, setWallet] = useState(null);

    const onConnect = (address) => {
        if (address && window.solana) {
            setWallet(window.solana);
        } else {
            setWallet(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent">
                    NFT Minting
                </h1>
                
                <div className="bg-slate-800 rounded-lg p-6 mb-8 shadow-xl">
                    <WalletConnect onConnect={onConnect} />
                </div>

                <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
                    <MintNFT wallet={wallet} />
                </div>
            </div>
        </div>
    );
}