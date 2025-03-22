# Azure Key Vault Integration for Firebase Credentials

This document explains how the application securely manages Firebase credentials using Azure Key Vault, eliminating the need to store sensitive information in the codebase.

## Overview

Instead of hardcoding Firebase API keys and service account credentials directly in the codebase, we now retrieve them securely from Azure Key Vault at runtime. This approach offers several advantages:

1. **Enhanced Security**: Sensitive credentials are never stored in the codebase
2. **Centralized Secrets Management**: All credentials are managed in one secure location
3. **Simplified Rotation**: Credentials can be updated without code changes
4. **Role-Based Access Control**: Azure's robust permissions system controls access to secrets

## Setup Instructions

### 1. Prerequisites

- Azure Account with permissions to create a Key Vault
- Azure CLI installed and authenticated
- Firebase project with service account credentials

### 2. Create Azure Key Vault

```bash
# Login to Azure
az login

# Create a resource group (if needed)
az group create --name MyResourceGroup --location EastUS

# Create a Key Vault
az keyvault create --name MyAppKeyVault --resource-group MyResourceGroup --location EastUS
```

### 3. Configure Environment Variables

Create a `.env` file in the project root with the following content:

```
# Azure Key Vault Configuration
AZURE_KEY_VAULT_NAME=MyAppKeyVault
```

### 4. Upload Firebase Credentials to Azure Key Vault

Place your `serviceAccountKey.json` file in the project root, then run:

```bash
npm run upload-secrets
```

This will:
- Upload your Firebase service account key to Azure Key Vault
- Upload a consolidated Firebase config JSON object (ideal for Managed Identity)
- Upload individual Firebase configuration values as separate secrets (for backward compatibility)

### 5. Verify Configuration

After uploading secrets, verify they exist in your Key Vault:

```bash
az keyvault secret list --vault-name MyAppKeyVault
```

### 6. Run the Application

Start the application with:

```bash
npm run dev
```

The application will now securely retrieve Firebase credentials from Azure Key Vault on startup.

## How It Works

1. When the application starts, it initializes Firebase with empty placeholder values
2. It then connects to Azure Key Vault using `DefaultAzureCredential`
3. Retrieves the Firebase configuration values from Key Vault
4. Reinitializes Firebase with the retrieved credentials
5. The application proceeds with the authenticated Firebase connection

## Production Environments with Managed Identity (Recommended)

For production environments, we recommend using Azure Managed Identity which eliminates the need for storing credentials:

### 1. Enable Managed Identity

```bash
# For an Azure App Service
az webapp identity assign --resource-group MyResourceGroup --name MyWebApp

# Note the principalId from the output
```

### 2. Grant Key Vault Access

```bash
# Assign the Key Vault Secrets User role to the Managed Identity
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <principalId> \
  --scope /subscriptions/<subscriptionId>/resourceGroups/MyResourceGroup/providers/Microsoft.KeyVault/vaults/MyAppKeyVault
```

### 3. No Code Changes Required

The application already uses `DefaultAzureCredential`, which automatically detects and uses Managed Identity in an Azure environment. The credential attempts various authentication methods in this order:

1. Environment Variables
2. Managed Identity
3. Azure CLI
4. Visual Studio Code
5. Interactive Browser

When running on Azure with Managed Identity enabled, it will use the Managed Identity authentication method.

## Security Considerations

- The Azure Key Vault access is managed via Azure's authentication system
- Default Azure Credential supports multiple authentication methods, including Managed Identity for production environments
- Local development can use Azure CLI authentication
- Service account key is stored as a JSON string in a single secret
- Environment variables are never committed to source control

## Consolidated vs Individual Secrets

Our implementation supports two approaches for storing Firebase configuration:

1. **Consolidated Secret (Recommended for Production)**: 
   - Single JSON object containing all Firebase config values
   - Stored as `FIREBASE_CONFIG` in Key Vault
   - Reduces number of Key Vault operations
   - Ideal for Managed Identity

2. **Individual Secrets (Backward Compatibility)**:
   - Each Firebase config value stored as a separate secret
   - Allows updating individual values without affecting others
   - Used as a fallback if consolidated approach fails

The application tries the consolidated approach first, then falls back to individual secrets if needed.

## Troubleshooting

If you encounter issues:

1. **Authentication Errors**: Ensure you're logged in with `az login` and have proper permissions to the Key Vault
2. **Missing Secrets**: Verify the secrets exist in Key Vault using the Azure Portal or CLI
3. **Invalid Configuration**: Check that the AZURE_KEY_VAULT_NAME is properly set in your .env file
4. **Permission Issues**: Ensure your Azure account has "Get" permissions on secrets

## Security Best Practices

1. **Rotate credentials regularly**: Update secrets in Key Vault periodically
2. **Use access policies**: Restrict Key Vault access to specific identities
3. **Enable Key Vault auditing**: Monitor access to your secrets
4. **Never commit serviceAccountKey.json**: Keep it in .gitignore and delete after uploading to Key Vault 