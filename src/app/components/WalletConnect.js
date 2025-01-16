import { useEffect, useState } from 'react';

const WalletConnect = ({ onConnect }) => {
    const [walletAddress, setWalletAddress] = useState(null);

    const connectWallet = async () => {
        if (window.solana) {
            const provider = window.solana;
            await provider.connect();
            setWalletAddress(provider.publicKey.toString());
            onConnect(provider.publicKey.toString());
        } else {
            alert('Solana wallet not found! Install Phantom wallet.');
        }
    };

    useEffect(() => {
        if (window.solana) {
            window.solana.on('connect', () => {
                setWalletAddress(window.solana.publicKey.toString());
                onConnect(window.solana.publicKey.toString());
            });
        }
    }, []);

    return (
        <div>
            {walletAddress ? (
                <p>Connected: {walletAddress}</p>
            ) : (
                <button onClick={connectWallet}>Connect Wallet</button>
            )}
        </div>
    );
};

export default WalletConnect;