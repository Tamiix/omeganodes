import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

// Known Solana stake pool programs and orgs by withdraw authority
const KNOWN_AUTHORITIES: Record<string, { name: string; type: string }> = {
  'stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq': { name: 'Lido (stSOL)', type: 'pool' },
  'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy': { name: 'Stake Pool Program', type: 'pool' },
  'J1to3PQfXidUUhprQWgDKMaNFSMBJih42Lpesgn39tVE': { name: 'JitoSOL', type: 'pool' },
  'BgKRVrea2sEWgfYnMT7juCU3CdPnv3eSjjPdey3rDmMv': { name: 'JitoSOL', type: 'pool' },
  'GBMQLCii4MFbEVtNOf51rejJp6ao8ho6HHbEiwKyrp5w': { name: 'JPool', type: 'pool' },
  'H1X1bCFKJfriM16bPSBz3hXnqGCaHRw5XFDz7X4PC3Q': { name: 'Binance', type: 'exchange' },
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': { name: 'Kraken', type: 'exchange' },
};

interface StakeAccount {
  pubkey: string;
  delegated_stake: number;
  withdraw_authority: string;
  [key: string]: any;
}

interface TopStakersProps {
  stakes: StakeAccount[];
  totalStake: number;
}

const shortenAddress = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

const TopStakers = ({ stakes, totalStake }: TopStakersProps) => {
  const topAccounts = [...stakes]
    .sort((a, b) => (b.delegated_stake || 0) - (a.delegated_stake || 0))
    .slice(0, 15);

  return (
    <div className="border border-border/30 rounded-lg bg-card/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Top Stake Accounts
        </div>
        <Badge variant="outline" className="text-[10px] text-muted-foreground/60 font-mono">
          {stakes.length} total
        </Badge>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/50 border-b border-border/10">
        <span>#</span>
        <span>Account</span>
        <span className="text-right w-28">Stake</span>
        <span className="text-right w-14">Share</span>
      </div>

      {topAccounts.map((account, i) => {
        const stakeSOL = (account.delegated_stake || 0) / 1e9;
        const share = totalStake > 0 ? (stakeSOL / totalStake) * 100 : 0;
        const known = KNOWN_AUTHORITIES[account.withdraw_authority];

        return (
          <div
            key={account.pubkey}
            className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 items-center px-4 py-2.5 border-b border-border/10 last:border-0 hover:bg-muted/20 transition-colors"
          >
            <span className="text-xs text-muted-foreground/40 font-mono tabular-nums">{i + 1}</span>

            <div className="min-w-0 flex items-center gap-2">
              <a
                href={`https://solscan.io/account/${account.pubkey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1 tabular-nums"
              >
                {shortenAddress(account.pubkey)}
                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/30" />
              </a>
              {known && (
                <span className="text-[10px] text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded">
                  {known.name}
                </span>
              )}
            </div>

            <span className="text-sm font-mono tabular-nums text-foreground text-right w-28">
              ◎ {stakeSOL.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>

            <span className={`text-sm font-mono tabular-nums text-right w-14 ${
              share > 10 ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {share.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default TopStakers;
