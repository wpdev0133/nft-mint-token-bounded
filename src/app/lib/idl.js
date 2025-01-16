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
                    "name": "nftAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "recipientTokenAccount",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "capyTokenMint",
                    "isMut": false,
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
                }
            ],
            "args": [
                {
                    "name": "multiplier",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "nftAccount",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "minted_count",
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
        }
    ]
};