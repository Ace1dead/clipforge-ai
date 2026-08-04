import { useState } from 'react'
import { Calculator, DollarSign, TrendingUp, Repeat, FileVideo } from 'lucide-react'
import { Card, Input, Stat, Tabs, Button, toast } from '../components/ui'
import { viewsToMoney, postsToMillionViews, creatorMoney, clipsFromOneVideo, cpmRpm } from '../lib/calculators'
import { fmtMoney } from '../lib/format'

export function Calculators() {
  const [tab, setTab] = useState('money')
  const [views, setViews] = useState(100000)
  const [rpm, setRpm] = useState(4)
  const [avgViews, setAvgViews] = useState(2000)
  const [audience, setAudience] = useState(10000)
  const [eng, setEng] = useState(3)
  const [conv, setConv] = useState(1.5)
  const [price, setPrice] = useState(29)
  const [videoMin, setVideoMin] = useState(60)
  const [clipSec, setClipSec] = useState(45)
  const [overlap, setOverlap] = useState(5)

  const money = viewsToMoney(views, rpm)
  const posts = postsToMillionViews(avgViews)
  const creator = creatorMoney(audience, eng, conv, price)
  const clips = clipsFromOneVideo(videoMin, clipSec, overlap)
  const cpm = cpmRpm(Math.round(views * 0.9), money.revenue)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Calculator size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Creator Calculators</h1>
          <p className="text-[13px] text-muted">Estimate earnings, goals and clip counts with real platform math.</p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: 'money', label: 'Views → Money', icon: <DollarSign size={14} /> },
            { id: 'posts', label: 'Posts to 1M', icon: <TrendingUp size={14} /> },
            { id: 'creator', label: 'Creator Money', icon: <TrendingUp size={14} /> },
            { id: 'clips', label: 'Clips from video', icon: <FileVideo size={14} /> },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-5 grid md:grid-cols-2 gap-5">
        {tab === 'money' && (
          <>
            <Card className="p-5">
              <Label>Monthly views</Label>
              <Input type="number" value={views} onChange={(e) => setViews(Number(e.target.value))} />
              <div className="mt-4">
                <Label>RPM ($ per 1000 views)</Label>
                <Input type="number" step="0.5" value={rpm} onChange={(e) => setRpm(Number(e.target.value))} />
              </div>
            </Card>
            <div className="space-y-3">
              <Stat label="Estimated revenue" value={fmtMoney(money.revenue)} accent />
              <Stat label="Effective CPM" value={fmtMoney(cpm.cpm)} />
              <Stat label="RPM" value={fmtMoney(rpm)} />
            </div>
          </>
        )}
        {tab === 'posts' && (
          <>
            <Card className="p-5">
              <Label>Average views per post</Label>
              <Input type="number" value={avgViews} onChange={(e) => setAvgViews(Number(e.target.value))} />
            </Card>
            <div className="space-y-3">
              <Stat label="Posts to reach 1M" value={posts.posts.toLocaleString()} accent />
              <Stat label="At 3 posts/week" value={`${posts.weeksAt3PerWeek} weeks`} />
              <Stat label="≈ months" value={(posts.weeksAt3PerWeek / 4.3).toFixed(1)} />
            </div>
          </>
        )}
        {tab === 'creator' && (
          <>
            <Card className="p-5">
              <Label>Audience size</Label>
              <Input type="number" value={audience} onChange={(e) => setAudience(Number(e.target.value))} />
              <div className="mt-3"><Label>Engagement %</Label><Input type="number" step="0.1" value={eng} onChange={(e) => setEng(Number(e.target.value))} /></div>
              <div className="mt-3"><Label>Conversion %</Label><Input type="number" step="0.1" value={conv} onChange={(e) => setConv(Number(e.target.value))} /></div>
              <div className="mt-3"><Label>Product price ($)</Label><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
            </Card>
            <div className="space-y-3">
              <Stat label="Paying customers" value={creator.paying.toFixed(0)} accent />
              <Stat label="Monthly revenue" value={fmtMoney(creator.monthly)} />
              <Stat label="Yearly revenue" value={fmtMoney(creator.yearly)} />
            </div>
          </>
        )}
        {tab === 'clips' && (
          <>
            <Card className="p-5">
              <Label>Video length (minutes)</Label>
              <Input type="number" value={videoMin} onChange={(e) => setVideoMin(Number(e.target.value))} />
              <div className="mt-3"><Label>Clip length (seconds)</Label><Input type="number" value={clipSec} onChange={(e) => setClipSec(Number(e.target.value))} /></div>
              <div className="mt-3"><Label>Overlap (seconds)</Label><Input type="number" value={overlap} onChange={(e) => setOverlap(Number(e.target.value))} /></div>
            </Card>
            <div className="space-y-3">
              <Stat label="Possible clips" value={clips.toString()} accent />
              <Stat label="Total clip minutes" value={((clips * clipSec) / 60).toFixed(0)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: string }) {
  return <p className="text-[12px] text-muted font-medium mb-1.5">{children}</p>
}