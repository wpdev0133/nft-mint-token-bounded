export const IDL = {
    "version": "0.1.0",
    "name": "mint_nft_with_rewards",
    "instructions": [
        {
            "name": "mintNft",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "mintPass",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "paymentVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "nftMint",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "nftTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "vaultTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "capyTokenMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "nftMintState",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "multiplier",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "unlockTokens",
            "accounts": [
                {
                    "name": "owner",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "tokenVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vaultTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "recipientTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        }
    ],
    "accounts": [
        {
            "name": "tokenVault",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "nftMint",
                        "type": "publicKey"
                    },
                    {
                        "name": "tokenAmount",
                        "type": "u64"
                    },
                    {
                        "name": "isLocked",
                        "type": "bool"
                    },
                    {
                        "name": "owner",
                        "type": "publicKey"
                    }
                ]
            }
        },
        {
            "name": "mintState",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "totalMinted",
                        "type": "u64"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "NoMintPass",
            "msg": "User does not have a mint pass and insufficient SOL balance"
        },
        {
            "code": 6001,
            "name": "UnauthorizedUnlock",
            "msg": "Only the NFT owner can unlock tokens"
        },
        {
            "code": 6002,
            "name": "TokensAlreadyUnlocked",
            "msg": "Tokens are already unlocked"
        }
    ],
    "metadata": {
        "address": process.env.NEXT_PUBLIC_PROGRAM_ID
    }
};