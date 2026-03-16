import { ExternalLink } from 'lucide-react';

const KNOWN_AUTHORITIES: Record<string, string> = {
  'stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq': 'Lido',
  'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy': 'Stake Pool',
  'J1to3PQfXidUUhprQWgDKMaNFSMBJih42Lpesgn39tVE': 'JitoSOL',
  'BgKRVrea2sEWgfYnMT7juCU3CdPnv3eSjjPdey3rDmMv': 'JitoSOL',
  'GBMQLCii4MFbEVtNOf51rejJp6ao8ho6HHbEiwKyrp5w': 'JPool',
  'H1X1bCFKJfriM16bPSBz3hXnqGCaHRw5XFDz7X4PC3Q': 'Binance',
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': 'Kraken',
};

interface StakeAccount {
  pubkey: string;
  delegated_stake: number;
  withdraw_authority: string;
  [key: string]: any;
}

const short = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

const TopStakers = ({ stakes, totalStake }: { stakes: StakeAccount[]; totalStake: number }) => {
  const top = [...stakes]
    .sort((a, b) => (b.delegated_stake || 0) - (a.delegated_stake || 0))
    .slice(0, 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] text-muted-foreground/50">Top Accounts</span>
        <span className="text-[11px] text-muted-foreground/40 font-mono">{stakes.length} total</span>
      </div>

      {top.map((s, i) => {
        const sol = (s.delegated_stake || 0) / 1e9;
        const pct = totalStake > 0 ? (sol / totalStake) * 100 : 0;
        const org = KNOWN_AUTHORITIES[s.withdraw_authority];

        return (
          <div key={s.pubkey} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] text-muted-foreground/30 font-mono w-5 tabular-nums">{i + 1}</span>
              <a
                href={`https://solscan.io/account/${s.pubkey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {short(s.pubkey)}
                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/20" />
              </a>
              {org && <span className="text-[10px] text-muted-foreground/40">{org}</span>}
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums text-[13px]">
              <span className="text-foreground">◎ {sol.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              <span className="text-muted-foreground/40 w-12 text-right">{pct.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopStakers;
