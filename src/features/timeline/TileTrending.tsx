import { useEffect, useState } from "react";
import { getDefaultMisskeyAccount, loadAccounts } from "../../state/accounts/accountsStore";
import { fetchTrendingTags, type MisskeyTrendTag } from "../../integrations/misskey/api";

const REFRESH_MS = 1000 * 60 * 3;

export function TileTrending() {
  const [items, setItems] = useState<MisskeyTrendTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    const load = async () => {
      try {
        const accounts = await loadAccounts();
        const account = getDefaultMisskeyAccount(accounts);
        if (!account) throw new Error("No Misskey account connected");
        const next = await fetchTrendingTags(account);
        if (canceled) return;
        setItems(next);
        setErrorText(null);
      } catch (error) {
        if (canceled) return;
        setErrorText(error instanceof Error ? error.message : String(error));
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (loading && items.length === 0) return <div className="emptyState">Loading trends…</div>;
  if (errorText && items.length === 0) return <div className="emptyState">{errorText}</div>;

  return (
    <div className="tileScroller">
      <div className="list trendList">
        {items.map((item, index) => (
          <div className="listItem trendItem" key={item.tag}>
            <div className="trendRank">{index + 1}</div>
            <div className="trendBody">
              <div className="listTitle">#{item.tag}</div>
              <div className="listMeta">
                <span>{item.usersCount ?? 0} users</span>
                <span>{Array.isArray(item.chart) ? ` • ${item.chart.slice(-3).join(" / ")}` : ""}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
