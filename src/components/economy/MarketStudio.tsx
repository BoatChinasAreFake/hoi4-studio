import React, { useState, useMemo } from 'react';
import type { MarketSubsidiesConfig } from '../../types/economy';
import { generateMarketEffect } from '../../utils/militaryExporters';
import {
  ShoppingBag,
  Plus,
  Trash2,
  Coins,
  ArrowRightLeft,
  ShieldCheck,
  Code,
} from 'lucide-react';

const DEFAULT_MARKET_CONFIG: MarketSubsidiesConfig = {
  civFactoryExchangeRatio: 5.0,
  baseDeliveryDaysPerBatch: 30,
  bilateralSubsidies: [
    {
      buyerTag: 'FIN',
      sellerTag: 'SWE',
      equipmentCategory: 'infantry_equipment',
      discountPercent: 25,
      deliverySpeedBonusPercent: 30,
    },
    {
      buyerTag: 'ROM',
      sellerTag: 'GER',
      equipmentCategory: 'armor',
      discountPercent: 15,
      deliverySpeedBonusPercent: 20,
    },
    {
      buyerTag: 'CHI',
      sellerTag: 'USA',
      equipmentCategory: 'air',
      discountPercent: 35,
      deliverySpeedBonusPercent: 25,
    },
  ],
  tradeQuotaRules: [
    {
      ruleId: 'neutrality_export_ban',
      description: 'Neutral nations cannot export advanced military hardware until 20% World Tension.',
      minWorldTension: 20,
      embargoIdeologies: ['fascism'],
      marketPriorityTier: 'civilian',
    },
    {
      ruleId: 'strategic_arms_pact',
      description: 'Bilateral allies receive priority factory allocation and bypass civilian quotas.',
      minWorldTension: 40,
      embargoIdeologies: [],
      marketPriorityTier: 'strategic',
    },
  ],
};

export const MarketStudio: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [config, setConfig] = useState<MarketSubsidiesConfig>(DEFAULT_MARKET_CONFIG);

  // Contract Simulator State
  const [buyerTag, setBuyerTag] = useState<string>('FIN');
  const [sellerTag, setSellerTag] = useState<string>('SWE');
  const [equipmentType, setEquipmentType] = useState<string>('infantry_equipment');
  const [contractQuantity, setContractQuantity] = useState<number>(200);
  const [icCostPerUnit, setIcCostPerUnit] = useState<number>(4.0);
  const [civFactoriesAllocated, setCivFactoriesAllocated] = useState<number>(3);
  const [showScriptModal, setShowScriptModal] = useState<boolean>(false);

  // Find matching bilateral subsidy
  const activeSubsidy = useMemo(() => {
    return config.bilateralSubsidies.find(
      (s) =>
        s.buyerTag.toUpperCase() === buyerTag.toUpperCase() &&
        s.sellerTag.toUpperCase() === sellerTag.toUpperCase()
    );
  }, [config.bilateralSubsidies, buyerTag, sellerTag]);

  // Contract math calculations
  const contractSchedule = useMemo(() => {
    const totalIc = contractQuantity * icCostPerUnit;
    const baseContractCost = totalIc / config.civFactoryExchangeRatio;
    const discountRate = activeSubsidy ? activeSubsidy.discountPercent / 100 : 0.0;
    const subsidizedCost = Math.max(0, baseContractCost * (1.0 - discountRate));

    const batches = Math.max(1, Math.ceil(contractQuantity / 50));
    const speedBonusRate = activeSubsidy ? activeSubsidy.deliverySpeedBonusPercent / 100 : 0.0;
    const civSpeedFactor = Math.max(1, civFactoriesAllocated);
    const rawDaysPerBatch = (config.baseDeliveryDaysPerBatch / civSpeedFactor) * (1.0 - speedBonusRate * 0.5);
    const daysPerBatch = Math.max(10, Math.round(rawDaysPerBatch));
    const totalDays = daysPerBatch * batches;

    return {
      totalIc,
      baseContractCost: Math.round(baseContractCost * 10) / 10,
      subsidizedCost: Math.round(subsidizedCost * 10) / 10,
      discountSavings: Math.round((baseContractCost - subsidizedCost) * 10) / 10,
      batches,
      daysPerBatch,
      totalDays,
    };
  }, [
    contractQuantity,
    icCostPerUnit,
    civFactoriesAllocated,
    config.civFactoryExchangeRatio,
    config.baseDeliveryDaysPerBatch,
    activeSubsidy,
  ]);

  const handleAddSubsidy = () => {
    const newSub = {
      buyerTag: 'ENG',
      sellerTag: 'USA',
      equipmentCategory: 'air',
      discountPercent: 20,
      deliverySpeedBonusPercent: 20,
    };
    setConfig((prev) => ({
      ...prev,
      bilateralSubsidies: [...prev.bilateralSubsidies, newSub],
    }));
    onNotify?.('Added bilateral equipment subsidy agreement');
  };

  const handleDeleteSubsidy = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      bilateralSubsidies: prev.bilateralSubsidies.filter((_, i) => i !== index),
    }));
  };

  const paradoxScript = generateMarketEffect("MY_apply_market_subsidies", config);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101512] text-[#e3e5d9] overflow-hidden select-none">
      {/* Top Bar */}
      <div className="h-10 border-b border-[#30392e] bg-[#141a15] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-[#d6b878]" />
          <span className="text-xs font-bold text-[#e3e5d9]">
            International Market & Equipment Subsidies Studio (Arms Against Tyranny)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddSubsidy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#242d23] border border-[#3b4936] text-xs font-medium text-[#d6b878] hover:bg-[#323d2f] transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Subsidy Deal
          </button>
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e271c] border border-[#30392e] text-xs text-[#909b88] hover:text-[#e3e5d9] transition"
          >
            <Code className="h-3.5 w-3.5" />
            Export Script
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Subsidies List & Trade Quotas */}
        <div className="w-96 bg-[#141a15] border-r border-[#30392e] flex flex-col overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#253223] pb-2">
            <span className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-[#d6b878]" />
              Bilateral Equipment Subsidies
            </span>
            <span className="text-[10px] font-mono text-[#8b9983]">
              {config.bilateralSubsidies.length} active
            </span>
          </div>

          <div className="space-y-2">
            {config.bilateralSubsidies.map((sub, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#18201a] border border-[#2b3829] rounded-lg space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-[#101512] text-[#d6b878]">
                      {sub.buyerTag}
                    </span>
                    <span className="text-[#8b9983]">←</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#101512] text-[#a6bd87]">
                      {sub.sellerTag}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubsidy(idx)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex justify-between text-[11px] text-[#8b9983]">
                  <span>Category:</span>
                  <span className="font-mono text-[#e3e5d9]">{sub.equipmentCategory}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#232f22]">
                  <div className="flex justify-between">
                    <span className="text-[#8b9983]">Discount:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      -{sub.discountPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9983]">Delivery Speed:</span>
                    <span className="font-mono text-sky-400 font-bold">
                      +{sub.deliverySpeedBonusPercent}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trade Quota Rules */}
          <div className="pt-2 border-t border-[#253223] space-y-2">
            <span className="text-xs font-bold text-[#e3e5d9] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#a6bd87]" />
              Trade Quota & Tension Rules
            </span>

            {config.tradeQuotaRules.map((rule) => (
              <div
                key={rule.ruleId}
                className="p-2.5 bg-[#101512] border border-[#263324] rounded text-[11px] space-y-1"
              >
                <div className="flex justify-between font-bold text-[#d6b878]">
                  <span>{rule.ruleId}</span>
                  <span className="font-mono text-[#a6bd87]">{rule.minWorldTension}% Tension</span>
                </div>
                <div className="text-[#7e8d77]">{rule.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Interactive Arms Contract Simulator */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-[#161e18] p-5 rounded-lg border border-[#2f3d2c] space-y-5">
            <h2 className="text-sm font-bold text-[#d6b878] flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Interactive Arms Purchase & Delivery Schedule Simulator
            </h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Buyer Country Tag</label>
                <input
                  type="text"
                  maxLength={3}
                  value={buyerTag}
                  onChange={(e) => setBuyerTag(e.target.value.toUpperCase())}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#d6b878] font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Seller Country Tag</label>
                <input
                  type="text"
                  maxLength={3}
                  value={sellerTag}
                  onChange={(e) => setSellerTag(e.target.value.toUpperCase())}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#a6bd87] font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#8b9983]">Equipment Category</label>
                <select
                  value={equipmentType}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEquipmentType(val);
                    if (val === 'infantry_equipment') setIcCostPerUnit(4.0);
                    else if (val === 'armor') setIcCostPerUnit(12.0);
                    else if (val === 'air') setIcCostPerUnit(25.0);
                    else if (val === 'naval') setIcCostPerUnit(50.0);
                  }}
                  className="w-full bg-[#1b231d] border border-[#354332] rounded px-3 py-1.5 text-xs text-[#e3e5d9]"
                >
                  <option value="infantry_equipment">Infantry Weapons (IC: 4)</option>
                  <option value="armor">Medium Tanks (IC: 12)</option>
                  <option value="air">Fighter Aircraft (IC: 25)</option>
                  <option value="naval">Destroyer Hulls (IC: 50)</option>
                </select>
              </div>
            </div>

            {/* Sliders for Quantity and Factory Debt */}
            <div className="grid grid-cols-2 gap-6 pt-3 border-t border-[#253223]">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9983]">Contract Quantity:</span>
                  <span className="font-mono text-[#d6b878] font-bold">
                    {contractQuantity} units
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2000}
                  step={50}
                  value={contractQuantity}
                  onChange={(e) => setContractQuantity(parseInt(e.target.value))}
                  className="w-full accent-[#d6b878]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8b9983]">Civilian Factories Payment:</span>
                  <span className="font-mono text-[#a6bd87] font-bold">
                    {civFactoriesAllocated} Civ Factories
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={civFactoriesAllocated}
                  onChange={(e) => setCivFactoriesAllocated(parseInt(e.target.value))}
                  className="w-full accent-[#a6bd87]"
                />
              </div>
            </div>

            {/* Subsidies Applied Alert */}
            {activeSubsidy ? (
              <div className="p-3 bg-[#111c14] border border-[#2b4d32] rounded flex items-center justify-between text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    Bilateral Subsidy Active: {buyerTag} receives -{activeSubsidy.discountPercent}% cost
                    and +{activeSubsidy.deliverySpeedBonusPercent}% delivery rate from {sellerTag}.
                  </span>
                </div>
                <span className="font-mono font-bold">Applied</span>
              </div>
            ) : (
              <div className="p-2.5 bg-[#111712] border border-[#293626] rounded text-xs text-[#788871]">
                No bilateral subsidy between {buyerTag} and {sellerTag}. Standard market prices apply.
              </div>
            )}
          </div>

          {/* Delivery Projection Dashboard */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-1">
              <span className="text-[11px] text-[#8b9983] uppercase tracking-wider font-semibold">
                Contract Total (IC)
              </span>
              <div className="text-xl font-bold font-mono text-[#e3e5d9]">
                {contractSchedule.totalIc} IC
              </div>
              <div className="text-[10px] text-[#71806b]">
                Equivalent to {contractSchedule.baseContractCost} market credit points
              </div>
            </div>

            <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-1">
              <span className="text-[11px] text-[#8b9983] uppercase tracking-wider font-semibold">
                Subsidized Purchase Cost
              </span>
              <div className="text-xl font-bold font-mono text-[#d6b878]">
                {contractSchedule.subsidizedCost} credits
              </div>
              <div className="text-[10px] text-emerald-400 font-mono">
                Saved {contractSchedule.discountSavings} credits via subsidy
              </div>
            </div>

            <div className="bg-[#161e18] p-4 rounded-lg border border-[#2f3d2c] space-y-1">
              <span className="text-[11px] text-[#8b9983] uppercase tracking-wider font-semibold">
                Estimated Delivery Schedule
              </span>
              <div className="text-xl font-bold font-mono text-sky-400">
                {contractSchedule.totalDays} Days
              </div>
              <div className="text-[10px] text-[#8b9983]">
                {contractSchedule.batches} batches · ~{contractSchedule.daysPerBatch}d per 50 units
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-xl bg-[#18201a] border border-[#3b4b37] rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#131a14] border-b border-[#303f2e] flex items-center justify-between">
              <span className="text-xs font-bold text-[#d6b878]">
                Exported AAT Equipment Subsidies (.txt)
              </span>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-xs text-[#909b88] hover:text-[#e3e5d9]"
              >
                ✕ Close
              </button>
            </div>
            <pre className="p-4 bg-[#0d120f] text-[#a6bd87] text-xs font-mono overflow-auto max-h-96 select-text">
              {paradoxScript}
            </pre>
            <div className="p-3 bg-[#131a14] border-t border-[#303f2e] flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(paradoxScript);
                  onNotify?.('Copied market subsidies script to clipboard');
                  setShowScriptModal(false);
                }}
                className="px-3 py-1 rounded bg-[#d6b878] text-[#141a14] text-xs font-bold"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
