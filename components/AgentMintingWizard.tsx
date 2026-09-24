"use client";

import React, { useState } from "react";
import { validateAgentMetadataSchema } from "@/lib/agentMetadataSchema";
import { buildAgentMintTx, signTransactionWithFreighter, submitTransaction } from "@/lib/stellar";
import { useStellarWallet } from "@/components/context/StellarWalletProvider";
import { STELLAR_NETWORKS } from "@/lib/stellar-constants";
// @ts-ignore
import { uploadToIPFS } from "../../lib/ipfs";

interface StepProps {
  onNext: (data: any) => void;
  data: any;
}

function DeployStep({ onNext, data }: StepProps) {
  const { wallet, network } = useStellarWallet();
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDeploying, setIsDeploying] = useState(false);

  async function handleDeploy() {
    setStatus("Building transaction...");
    setError("");
    setIsDeploying(true);
    try {
      if (!wallet?.isConnected || !wallet?.publicKey) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      const tx = await buildAgentMintTx({
        network,
        creatorPublicKey: wallet.publicKey,
        ipfsCid: data.ipfsCid,
        royaltyPercent: data.royaltyPercent || 0,
      });

      setStatus("Awaiting wallet signature...");
      const signed = await signTransactionWithFreighter(tx, network);
      if (!signed.success) {
        throw new Error(signed.error || "User rejected transaction");
      }

      setStatus("Submitting transaction to network...");
      const result = await submitTransaction(tx.toEnvelope().toXDR("base64"), network);
      if (!result.success) {
        throw new Error(result.error || "Failed to submit transaction");
      }

      setTxHash(result.hash || "");
      setStatus("Agent deployed successfully!");
      onNext({ ...data, txHash: result.hash });
    } catch (e: any) {
      setError(e.message || "Deployment failed. Please try again.");
      setStatus("");
    } finally {
      setIsDeploying(false);
    }
  }

  const networkConfig = STELLAR_NETWORKS[network];
  const explorerUrl =
    network === "mainnet"
      ? `https://stellar.expert/explorer/public/tx/`
      : `https://stellar.expert/explorer/testnet/tx/`;

  if (!wallet?.isConnected) {
    return (
      <div>
        <h2>Deploy Agent Token</h2>
        <div style={{ padding: "16px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "4px" }}>
          <p>Please connect your wallet to deploy an agent.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Deploy Agent Token</h2>
      <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
        <p><strong>Connected wallet:</strong> {wallet.publicKey.slice(0, 10)}...{wallet.publicKey.slice(-10)}</p>
        <p><strong>Network:</strong> {networkConfig?.displayName}</p>
      </div>
      <button onClick={handleDeploy} disabled={isDeploying}>
        {isDeploying ? "Deploying..." : "Deploy to Stellar"}
      </button>
      {status && <div style={{ marginTop: "12px", color: "#1f2937" }}>{status}</div>}
      {txHash && (
        <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "4px" }}>
          <p style={{ color: "#15803d", marginBottom: "8px" }}>✓ Success! Agent deployed.</p>
          <p>Transaction: <a href={`${explorerUrl}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#059669", textDecoration: "underline" }}>{txHash.slice(0, 16)}...</a></p>
        </div>
      )}
      {error && <div style={{ marginTop: "12px", color: "#dc2626", padding: "12px", backgroundColor: "#fee2e2", borderRadius: "4px" }}>{error}</div>}
    </div>
  );
}

function AgentDetailsStep({ onNext, data }: StepProps) {
  const [form, setForm] = useState({
    name: data.name || "",
    description: data.description || "",
    attributes: data.attributes || {},
    image: data.image || null,
  });
  const [errors, setErrors] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, image: e.target.files[0] });
    }
  }

  function handleNext() {
    const errs = validateAgentMetadataSchema(form) || [];
    setErrors(errs);
    if (errs.length === 0) onNext(form);
  }

  return (
    <div>
      <h2>Agent Details</h2>
      <div style={{ marginBottom: "12px" }}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Agent Name" style={{ width: "100%", padding: "8px", marginBottom: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
        <textarea name="description" value={form.description} onChange={handleChange} placeholder="Agent Description" style={{ width: "100%", padding: "8px", marginBottom: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minHeight: "100px" }} />
        <input type="file" accept="image/*" onChange={handleImage} style={{ marginBottom: "8px" }} />
      </div>
      <button onClick={handleNext} style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Next</button>
      {errors.length > 0 && <ul style={{ marginTop: "12px", color: "#dc2626" }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}

function MetadataUploadStep({ onNext, data }: StepProps) {
  const [status, setStatus] = useState<string>("");
  const [ipfsUrl, setIpfsUrl] = useState<string>("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    setStatus("Uploading to IPFS...");
    setIsUploading(true);
    const schemaErrors = validateAgentMetadataSchema(data);
    if (schemaErrors.length > 0) {
      setErrors(schemaErrors);
      setStatus("");
      setIsUploading(false);
      return;
    }
    try {
      const result = await uploadToIPFS(data);
      setIpfsUrl(result.url);
      setStatus("Upload complete!");
      onNext({ ...data, ipfsUrl: result.url, ipfsCid: result.cid });
    } catch (e) {
      setStatus("");
      setErrors([String(e) || "Upload failed"]);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <h2>Upload Metadata to IPFS</h2>
      <button onClick={handleUpload} disabled={isUploading} style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", borderRadius: "4px", border: "none", cursor: isUploading ? "wait" : "pointer" }}>
        {isUploading ? "Uploading..." : "Upload to IPFS"}
      </button>
      {status && <div style={{ marginTop: "12px", color: "#1f2937" }}>{status}</div>}
      {ipfsUrl && <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#f0fdf4", borderRadius: "4px", color: "#15803d" }}>IPFS URL: <a href={ipfsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#059669", textDecoration: "underline" }}>{ipfsUrl.slice(0, 50)}...</a></div>}
      {errors.length > 0 && <ul style={{ marginTop: "12px", color: "#dc2626" }}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  );
}

function ReviewStep({ onNext, data }: StepProps) {
  return (
    <div>
      <h2>Review Agent Details</h2>
      <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
        {data.image && (
          <div style={{ marginBottom: "12px" }}>
            <img src={typeof data.image === "string" ? data.image : URL.createObjectURL(data.image)} alt="Agent" style={{ maxWidth: "200px", borderRadius: "4px" }} />
          </div>
        )}
        <div style={{ fontSize: "14px", color: "#4b5563" }}>
          <p><strong>Name:</strong> {data.name}</p>
          <p><strong>Description:</strong> {data.description}</p>
          {data.ipfsUrl && <p><strong>IPFS URL:</strong> {data.ipfsUrl.slice(0, 50)}...</p>}
        </div>
      </div>
      <button onClick={() => onNext(data)} style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", borderRadius: "4px", border: "none", cursor: "pointer" }}>Deploy to Stellar</button>
    </div>
  );
}

export default function AgentMintingWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<any>({});

  function nextStep(data: any) {
    setFormData({ ...formData, ...data });
    setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  const stepLabels = ["Details", "Upload", "Review", "Deploy"];

  const steps = [
    <AgentDetailsStep key="details" onNext={nextStep} data={formData} />,
    <MetadataUploadStep key="upload" onNext={nextStep} data={formData} />,
    <ReviewStep key="review" onNext={nextStep} data={formData} />,
    <DeployStep key="deploy" onNext={nextStep} data={formData} />,
  ];

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          {stepLabels.map((label, index) => (
            <div key={label} style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: index <= step ? "#059669" : "#e5e7eb",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto",
                  marginBottom: "4px",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                {index + 1}
              </div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            height: "4px",
            backgroundColor: "#e5e7eb",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: "#059669",
              width: `${(step / (stepLabels.length - 1)) * 100}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div style={{ minHeight: "300px", marginBottom: "20px" }}>
        {steps[step]}
      </div>

      {step > 0 && step < 3 && (
        <button onClick={prevStep} style={{ padding: "8px 16px", backgroundColor: "#e5e7eb", color: "#1f2937", borderRadius: "4px", border: "none", cursor: "pointer" }}>
          Back
        </button>
      )}
    </div>
  );
}
