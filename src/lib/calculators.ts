export function viewsToMoney(views: number, rpm: number): { revenue: number; cpm: number } {
  const cpm = rpm * 0.8
  return { revenue: (views / 1000) * rpm, cpm }
}

export function cpmRpm(adImpressions: number, revenue: number): { cpm: number; rpm: number } {
  const cpm = revenue / Math.max(1, adImpressions) * 1000
  const rpm = revenue / Math.max(1, adImpressions) * 1000 * 1.25
  return { cpm, rpm }
}

export function postsToMillionViews(avgViews: number): { posts: number; weeksAt3PerWeek: number } {
  const posts = Math.ceil(1_000_000 / Math.max(1, avgViews))
  return { posts, weeksAt3PerWeek: Math.ceil(posts / 3) }
}

export function creatorMoney(audience: number, engagement: number, conversion: number, price: number): { paying: number; monthly: number; yearly: number } {
  const engaged = audience * (engagement / 100)
  const paying = engaged * (conversion / 100)
  return { paying, monthly: paying * price, yearly: paying * price * 12 }
}

export function clipsFromOneVideo(videoMin: number, clipSec: number, overlapSec: number): number {
  const totalSec = videoMin * 60
  const step = Math.max(1, clipSec - overlapSec)
  if (clipSec > totalSec) return 0
  return Math.floor((totalSec - clipSec) / step) + 1
}

export function videoSizeEstimate(durationSec: number, bitrateMbps: number): number {
  return (durationSec * bitrateMbps) / 8
}