import { updateSignupCampaign } from "./actions";
import { Badge, SaveButton, money } from "./form-components";
import type { SignupCampaign } from "@/lib/signup-reward";

export interface RewardProductOption {
  id: string;
  name: string;
  price_aed: string | number;
}

/**
 * Configure the "free pizza for the first N registrants" launch campaign. New
 * users who register while this is active are auto-issued a unique single-use
 * code worth the chosen pizza, bound to their email + phone so they can't
 * re-claim by swapping one of them.
 */
export function SignupCampaignCard({
  campaign,
  products,
}: {
  campaign: SignupCampaign;
  products: RewardProductOption[];
}) {
  const remaining = Math.max(0, campaign.maxClaims - campaign.claimsCount);
  const pct = campaign.maxClaims
    ? Math.min(100, Math.round((campaign.claimsCount / campaign.maxClaims) * 100))
    : 0;
  const capped = campaign.claimsCount >= campaign.maxClaims;
  const rewardSelected = Boolean(campaign.rewardProductId);
  const misconfigured = campaign.active && !rewardSelected;

  return (
    <div className="mt-8 rounded-md border border-border bg-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl uppercase tracking-[1px]">
              Free Pizza · First {campaign.maxClaims.toLocaleString("en-AE")}
            </h2>
            <Badge tone={campaign.active ? "active" : "hidden"}>
              {campaign.active ? "Live" : "Off"}
            </Badge>
            {capped ? <Badge tone="warning">Cap reached</Badge> : null}
            {misconfigured ? (
              <Badge tone="warning">Pick a reward pizza</Badge>
            ) : null}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            New registrants are auto-issued a unique single-use code worth the
            chosen pizza. Each claim is locked to the email <em>and</em> the
            mobile number, so swapping just one won&rsquo;t earn a second pizza.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl">
            {campaign.claimsCount.toLocaleString("en-AE")}
            <span className="text-base text-muted-foreground">
              {" "}
              / {campaign.maxClaims.toLocaleString("en-AE")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {remaining.toLocaleString("en-AE")} free pizzas left
          </div>
        </div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
      </div>

      <form
        action={updateSignupCampaign}
        className="mt-6 grid gap-3 sm:grid-cols-2"
      >
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="min-h-5 font-display text-xs uppercase tracking-[0.1em] text-foreground">
            Reward pizza
          </span>
          <select
            name="reward_product_id"
            defaultValue={campaign.rewardProductId ?? ""}
            className="h-11 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground focus:border-brand focus:outline-none"
          >
            <option value="">— Select a pizza —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money(p.price_aed)} AED
              </option>
            ))}
          </select>
          <span className="min-h-8 text-xs leading-4 text-muted-foreground">
            The discount equals this pizza&rsquo;s current price.
          </span>
        </label>

        <label className="grid min-w-0 gap-1 text-sm">
          <span className="min-h-5 font-display text-xs uppercase tracking-[0.1em] text-foreground">
            Maximum claims
          </span>
          <input
            name="max_claims"
            type="number"
            min="1"
            step="1"
            defaultValue={campaign.maxClaims}
            className="h-11 w-full rounded-none border border-border bg-background pl-3 pr-8 text-sm text-foreground focus:border-brand focus:outline-none"
          />
          <span className="min-h-8 text-xs leading-4 text-muted-foreground">
            Total free pizzas to give away (e.g. 1000).
          </span>
        </label>

        <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
          <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <input
              name="active"
              type="checkbox"
              defaultChecked={campaign.active}
            />
            Campaign live
          </label>
          <SaveButton>Save campaign</SaveButton>
        </div>
      </form>
    </div>
  );
}
