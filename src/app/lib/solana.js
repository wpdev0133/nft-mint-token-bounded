import { Connection, clusterApiUrl, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createInitializeMintInstruction, MINT_SIZE } from '@solana/spl-token';
import { Program, AnchorProvider } from '@project-serum/anchor';
import { IDL } from './idl';

const PROGRAM_ID = new PublicKey('6PE1No7QEVHVH8SgV5BbQCRL9EWs5VjvvaaUecN2LNNi');

const config = {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    wsEndpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT,
    httpHeaders: {
        'Content-Type': 'application/json',
    },
    skipPreflight: true,
};

export const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('devnet'),
    config
);

export const getErrorMessage = (error) => {
    if (error instanceof Error) {
        let message = error.message;
        if ('logs' in error && Array.isArray(error.logs) && error.logs.length > 0) {
            message += '\n\nProgram Logs:\n' + error.logs.join('\n');
        }
        return message;
    }
    if (typeof error === 'object' && error !== null) {
        return JSON.stringify(error, null, 2);
    }
    if (typeof error === 'string') return error;
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
            'confirmed'
        );

        if (confirmation.value.err) {
            throw new Error('Transaction failed');
        }

        return confirmation;
    } catch (error) {
        console.error('Transaction confirmation failed:', getErrorMessage(error));
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

export const mintNFT = async (wallet, mintKeypair) => {
    try {
        if (!wallet.publicKey) throw new Error('Wallet not connected');

        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
        });

        const program = new Program(IDL, PROGRAM_ID, provider);

        // Calculate the rent-exempt balance
        const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

        // Get the associated token account for the user
        const associatedTokenAccount = await getAssociatedTokenAddress(
            mintKeypair.publicKey,
            wallet.publicKey
        );

        // Create instructions array
        const instructions = [
            // Create account for mint
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: MINT_SIZE,
                lamports,
                programId: TOKEN_PROGRAM_ID,
            }),
            // Initialize mint account
            createInitializeMintInstruction(
                mintKeypair.publicKey,
                0,
                wallet.publicKey,
                wallet.publicKey
            ),
        ];

        // Add the mint instruction
        const tx = await program.methods
            .mintNft()
            .accounts({
                mint: mintKeypair.publicKey,
                tokenAccount: associatedTokenAccount,
                mintAuthority: wallet.publicKey,
                user: wallet.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .preInstructions(instructions)
            .signers([mintKeypair])
            .rpc();

        await confirmTransaction(tx);
        return tx;
    } catch (error) {
        console.error('Error minting NFT:', getErrorMessage(error));
        throw error;
    }
};