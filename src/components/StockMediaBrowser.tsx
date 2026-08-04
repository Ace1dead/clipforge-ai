import { useState, useEffect, useCallback } from 'react';
import { Search, Video, Image, Grid3X3, Loader2 } from 'lucide-react';
import { searchStock, STOCK_CATEGORIES, type StockMediaItem } from '../lib/stockMedia';
import { Button, Input, cx } from './ui';

interface Props {
  type?: 'video' | 'image' | 'both';
  onSelect: (item: StockMediaItem) => void;
  orientation?: 'portrait' | 'landscape' | 'square';
}

export function StockMediaBrowser({ type = 'both', onSelect, orientation = 'portrait' }: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<StockMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const results = await searchStock(q, type, p, 18);
      if (p === 1) setItems(results);
      else setItems(prev => [...prev, ...results]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (query.trim()) {
      setPage(1);
      doSearch(query.trim(), 1);
    }
  }, [query, type]);

  const handleCategoryClick = (q: string) => {
    setQuery(q);
    setPage(1);
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    doSearch(query || 'background', next);
  };

  const handleSelect = (item: StockMediaItem) => {
    setSelectedId(item.id);
    onSelect(item);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search stock media..."
          className="pl-9"
        />
      </div>

      {!query && (
        <div className="flex flex-wrap gap-2">
          {STOCK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.query)}
              className="px-3 py-1.5 text-xs rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            className={cx(
              'relative aspect-[9/16] rounded-lg overflow-hidden border-2 transition-all',
              selectedId === item.id
                ? 'border-violet-500 ring-2 ring-violet-500/30'
                : 'border-transparent hover:border-zinc-600'
            )}
          >
            <img
              src={item.thumbnail}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
              <div className="flex items-center gap-1">
                {item.type === 'video' ? (
                  <Video className="w-3 h-3 text-zinc-300" />
                ) : (
                  <Image className="w-3 h-3 text-zinc-300" />
                )}
                <span className="text-[10px] text-zinc-300 truncate">{item.author}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {items.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLoadMore}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
        </Button>
      )}

      {items.length === 0 && !loading && query && (
        <div className="text-center py-6">
          <p className="text-sm text-zinc-500">No results found</p>
          <p className="text-xs text-zinc-600 mt-1">Set a Pexels API key in the server .env to enable stock media search</p>
        </div>
      )}
    </div>
  );
}
