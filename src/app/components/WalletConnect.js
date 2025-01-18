"use client"
import { useEffect, useState } from 'react';

const WalletConnect = ({ onConnect }) => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [connecting, setConnecting] = useState(false);

    const checkWalletConnection = async () => {
        if (window.solana && window.solana.isPhantom) {
            try {
                const response = await window.solana.connect({ onlyIfTrusted: true });
                const address = response.publicKey.toString();
                setWalletAddress(address);
                onConnect(address);
            } catch (error) {
                // User hasn't authorized the wallet yet
                console.log("Wallet not authorized yet");
            }
        }
    };

    const connectWallet = async () => {
        if (!window.solana || !window.solana.isPhantom) {
            window.open('https://phantom.app/', '_blank');
            return;
        }

        setConnecting(true);
        try {
            const response = await window.solana.connect();
            const address = response.publicKey.toString();
            setWalletAddress(address);
            onConnect(address);
        } catch (error) {
            console.error('Error connecting wallet:', error);
        } finally {
            setConnecting(false);
        }
    };

    const disconnectWallet = async () => {
        if (window.solana) {
            await window.solana.disconnect();
            setWalletAddress(null);
            onConnect(null);
        }
    };

    useEffect(() => {
        checkWalletConnection();

        window.solana?.on('connect', (publicKey) => {
            setWalletAddress(publicKey.toString());
            onConnect(publicKey.toString());
        });

        window.solana?.on('disconnect', () => {
            setWalletAddress(null);
            onConnect(null);
        });

        return () => {
            window.solana?.disconnect();
        };
    }, []);

    if (!window.solana) {
        return (
            <button
                onClick={() => window.open('https://phantom.app/', '_blank')}
                className="bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 flex items-center gap-2"
            >
                Install Phantom Wallet
            </button>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {walletAddress ? (
                <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-slate-300">Connected Wallet</p>
                    <div className="flex items-center gap-4">
                        <code className="bg-slate-700 px-4 py-2 rounded text-sm">
                            {`${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`}
                        </code>
                        <button
                            onClick={disconnectWallet}
                            className="text-sm text-slate-400 hover:text-red-400 transition-colors"
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={connectWallet}
                    disabled={connecting}
                    className={`bg-gradient-to-r from-purple-600 to-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 flex items-center gap-2 ${
                        connecting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
            )}
        </div>
    );
};

export default WalletConnect;