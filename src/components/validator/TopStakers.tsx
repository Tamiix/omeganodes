import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Users, Building2, User } from 'lucide-react';
import { motion } from 'framer-motion';

// Known Solana stake pool programs and orgs by withdraw authority
const KNOWN_AUTHORITIES: Record<string, { name: string; type: 'pool' | 'org' | 'exchange' | 'dao' }> = {
  // Stake pools
  'stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq': { name: 'Lido (stSOL)', type: 'pool' },
  'SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy': { name: 'Stake Pool Program', type: 'pool' },
  'MarinadeFinance1111111111111111111111111': { name: 'Marinade', type: 'pool' },
  'J1to3PQfXidUUhprQWgDKMaNFSMBJih42Lpesgn39tVE': { name: 'JitoSOL', type: 'pool' },
  'BgKRVrea2sEWgfYnMT7juCU3CdPnv3eSjjPdey3rDmMv': { name: 'JitoSOL', type: 'pool' },
  'GBMQLCii4MFbEVtNOf51rejJp6ao8ho6HHbEiwKyrp5w': { name: 'JPool', type: 'pool' },
  // Exchanges
  'H1X1bCFKJfriM16bPSBz3hXnqGCaHRw5XFDz7X4PC3Q': { name: 'Binance', type: 'exchange' },
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': { name: 'Kraken', type: 'exchange' },
};

interface StakeAccount {
  pubkey: string;
  delegated_stake: number;
  withdraw_authority: string;
  stake_authority: string;
  activation_epoch: number;
  balance: number;
  [key: string]: any;
}

interface TopStakersProps {
  stakes: StakeAccount[];
  totalStake: number;
}

const shortenAddress = (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;

const TopStakers = ({ stakes, totalStake }: TopStakersProps) => {
  // Group by withdraw authority to identify orgs
  const byAuthority = new Map<string, { stakes: StakeAccount[]; totalStake: number }>();
  
  for (const s of stakes) {
    const auth = s.withdraw_authority;
    const existing = byAuthority.get(auth);
    if (existing) {
      existing.stakes.push(s);
      existing.totalStake += (s.delegated_stake || 0) / 1e9;
    } else {
      byAuthority.set(auth, { stakes: [s], totalStake: (s.delegated_stake || 0) / 1e9 });
    }
  }

  // Sort by total stake descending
  const sortedAuthorities = [...byAuthority.entries()]
    .sort((a, b) => b[1].totalStake - a[1].totalStake)
    .slice(0, 15);

  // Also get top individual accounts
  const topAccounts = [...stakes]
    .sort((a, b) => (b.delegated_stake || 0) - (a.delegated_stake || 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Stakers by Authority */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Top Stakers by Authority
            <Badge variant="outline" className="text-xs font-normal ml-auto">
              {byAuthority.size} unique authorities
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Grouped by withdraw authority — shows organizations and pools delegating stake
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border/30">
              <span>Authority</span>
              <span className="text-right w-16">Accounts</span>
              <span className="text-right w-24">Total Stake</span>
              <span className="text-right w-16">Share</span>
            </div>
            
            {sortedAuthorities.map(([authority, data], i) => {
              const known = KNOWN_AUTHORITIES[authority];
              const share = totalStake > 0 ? (data.totalStake / totalStake) * 100 : 0;
              const isOrg = known || data.stakes.length > 1;

              return (
                <motion.div
                  key={authority}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded ${isOrg ? 'bg-primary/10' : 'bg-muted/50'}`}>
                      {isOrg ? <Building2 className="w-3 h-3 text-primary" /> : <User className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      {known ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground">{known.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {known.type}
                          </Badge>
                        </div>
                      ) : (
                        <a
                          href={`https://solscan.io/account/${authority}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {shortenAddress(authority)}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                      {data.stakes.length > 1 && !known && (
                        <span className="text-[10px] text-muted-foreground">
                          Multi-account staker
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-sm text-muted-foreground text-right w-16">
                    {data.stakes.length}
                  </span>

                  <span className="text-sm font-medium text-foreground text-right w-24">
                    ◎ {data.totalStake.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>

                  <div className="text-right w-16">
                    <span className={`text-sm font-medium ${share > 10 ? 'text-primary' : share > 5 ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Individual Stake Accounts */}
      <Card className="bg-card/60 border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Top Stake Accounts
            <Badge variant="outline" className="text-xs font-normal ml-auto">
              {stakes.length} total accounts
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border/30">
              <span className="w-6">#</span>
              <span>Account</span>
              <span className="text-right w-24">Stake</span>
              <span className="text-right w-16">Share</span>
            </div>
            
            {topAccounts.map((account, i) => {
              const stakeSOL = (account.delegated_stake || 0) / 1e9;
              const share = totalStake > 0 ? (stakeSOL / totalStake) * 100 : 0;
              const known = KNOWN_AUTHORITIES[account.withdraw_authority];

              return (
                <motion.div
                  key={account.pubkey}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 rounded-md hover:bg-muted/30 transition-colors group"
                >
                  <span className="text-xs text-muted-foreground font-mono w-6">{i + 1}</span>
                  
                  <div className="min-w-0">
                    <a
                      href={`https://solscan.io/account/${account.pubkey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {shortenAddress(account.pubkey)}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {known && (
                      <span className="text-[10px] text-primary">{known.name}</span>
                    )}
                  </div>

                  <span className="text-sm font-medium text-foreground text-right w-24">
                    ◎ {stakeSOL.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>

                  <span className={`text-sm font-medium text-right w-16 ${share > 10 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {share.toFixed(1)}%
                  </span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TopStakers;
