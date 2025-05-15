interface Solana {
    isPhantom?: boolean;
    connect: () => Promise<{ publicKey: string }>;
    disconnect: () => Promise<void>;
    signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
    signTransaction: (transaction: any) => Promise<any>;
    signAllTransactions: (transactions: any[]) => Promise<any[]>;
    request: (request: any) => Promise<any>;
}

interface Window {
    solana?: Solana;
} 