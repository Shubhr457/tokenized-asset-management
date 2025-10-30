// Custom type definitions

export interface IUser {
  _id?: string;
  walletAddress: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_started';
  kycDocuments?: Array<{
    documentType: string;
    documentUrl: string;
    uploadedAt: Date;
  }>;
  complianceNotes?: Array<{
    note: string;
    addedBy: string;
    addedAt: Date;
  }>;
  role: 'user' | 'admin' | 'compliance' | 'minter';
  isActive: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAsset {
  _id?: string;
  assetId: number;
  tokenId: number;
  owner: string;
  assetType: 'property' | 'share' | 'collectible' | 'document' | 'other';
  name: string;
  description?: string;
  metadataURI: string;
  valuation: string;
  valuationCurrency?: string;
  isCompliant: boolean;
  status: 'Pending' | 'Active' | 'Frozen' | 'Delisted';
  registrationDate: Date;
  documents?: Array<{
    name: string;
    type: string;
    url: string;
    uploadedAt: Date;
  }>;
  images?: Array<{
    url: string;
    caption?: string;
    uploadedAt: Date;
  }>;
  additionalMetadata?: Map<string, any>;
  transferHistory?: Array<{
    from: string;
    to: string;
    price: string;
    timestamp: Date;
    txHash: string;
  }>;
  complianceNotes?: Array<{
    note: string;
    addedBy: string;
    addedAt: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITransaction {
  _id?: string;
  txHash: string;
  blockNumber?: number;
  blockHash?: string;
  from: string;
  to?: string;
  assetId?: number;
  tokenId?: number;
  type: 'registration' | 'transfer' | 'status_change' | 'compliance_update' | 'metadata_update' | 'valuation_update';
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
  confirmationCount?: number;
  error?: string;
  eventData?: Map<string, any>;
  createdAt?: Date;
  confirmedAt?: Date;
}

export interface IPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: IPagination;
  errors?: any[];
}

export interface IRegisterAssetRequest {
  to: string;
  metadataURI: string;
  assetType: 'property' | 'share' | 'collectible' | 'document' | 'other';
  valuation: number;
  name: string;
  description?: string;
}

export interface ICreateUserRequest {
  walletAddress: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface IUpdateComplianceRequest {
  status: boolean;
}

export interface IUpdateAssetStatusRequest {
  status: 'Pending' | 'Active' | 'Frozen' | 'Delisted';
}

export interface IBatchVerifyRequest {
  users: string[];
  status: boolean;
}

