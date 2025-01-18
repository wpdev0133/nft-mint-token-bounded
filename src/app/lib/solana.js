import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';

const commitment = 'confirmed';
const config = {
    commitment,
    confirmTransactionInitialTimeout: 60000,
    wsEndpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT,
    httpHeaders: {
        'Content-Type': 'application/json',
    },
};

export const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('devnet'),
    config
);

export const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'An unknown error occurred';
};

export const confirmTransaction = async (signature) => {
    try {
        const latestBlockhash = await connection.getLatestBlockhash();
        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            commitment
        );

        if (confirmation.value.err) {
            throw new Error('Transaction failed');
        }

        return confirmation;
    } catch (error) {
        console.error('Transaction confirmation failed:', error);
        throw new Error(`Transaction confirmation failed: ${getErrorMessage(error)}`);
    }
};

export const getTransactionUrl = (signature) => {
    const baseUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.solana.com';
    const network = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
    return `${baseUrl}/tx/${signature}?cluster=${network}`;
};

export const shortenAddress = (address, chars = 4) => {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const retryConnection = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};