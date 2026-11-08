import { MAP_C, MAP_D } from './map-data';

const NM: Record<string, [string, string]> = {
  Rangpur: ['রংপুর', 'Rangpur'],
  Mymensingh: ['ময়মনসিংহ', 'Mymensingh'],
  Sylhet: ['সিলেট', 'Sylhet'],
  Rajshahi: ['রাজশাহী', 'Rajshahi'],
  Khulna: ['খুলনা', 'Khulna'],
  Barishal: ['বরিশাল', 'Barishal'],
  Chattogram: ['চট্টগ্রাম', 'Chattogram'],
  Dhaka: ['ঢাকা', 'Dhaka'],
};

const OFF: Record<string, [number, number, 'start' | 'end']> = {
  Rangpur: [10, 3, 'start'],
  Mymensingh: [10, 3, 'start'],
  Sylhet: [10, 3, 'start'],
  Rajshahi: [10, 3, 'start'],
  Khulna: [-10, 3, 'end'],
  Barishal: [10, 16, 'start'],
  Chattogram: [10, 3, 'start'],
  Dhaka: [11, 20, 'start'],
};

export default function BdMap({ gid = 'lg' }: { gid?: string }) {
  const dh = MAP_C.Dhaka;
  const world: [number, number][] = [
    [-30, 20],
    [330, 10],
    [335, 330],
    [-30, 400],
  ];

  return (
    <svg viewBox='-40 -25 380 465' role='img' aria-label='Map of Bangladesh'>
      <defs>
        <linearGradient id={gid} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor='#ffffff' stopOpacity='.22' />
          <stop offset='1' stopColor='#2fd6a0' stopOpacity='.38' />
        </linearGradient>
      </defs>
      <path className='land' fill={`url(#${gid})`} d={MAP_D} />
      {world.map((w, i) => (
        <g key={`w${i}`}>
          <path
            className='flow'
            fill='none'
            stroke='#fff'
            strokeOpacity='.45'
            strokeWidth='1.1'
            d={`M${dh[0]},${dh[1]} Q${(dh[0] + w[0]) / 2} ${Math.min(dh[1], w[1]) * 0.6} ${w[0]},${w[1]}`}
          />
          <circle cx={w[0]} cy={w[1]} r='3' fill='#fff' />
        </g>
      ))}
      {Object.keys(NM)
        .filter((k) => k !== 'Dhaka')
        .map((k) => {
          const p = MAP_C[k];
          return (
            <path
              key={`f${k}`}
              className='flow'
              fill='none'
              stroke='#ffb3a3'
              strokeWidth='1.3'
              d={`M${dh[0]},${dh[1]} Q${(dh[0] + p[0]) / 2 + 12} ${(dh[1] + p[1]) / 2 - 12} ${p[0]},${p[1]}`}
            />
          );
        })}
      {Object.keys(NM).map((k) => {
        const p = MAP_C[k];
        const o = OFF[k];
        const isDhaka = k === 'Dhaka';
        return (
          <g key={k}>
            {isDhaka && <circle className='pulse' cx={p[0]} cy={p[1]} r='6' fill='#e9705a' />}
            <circle
              cx={p[0]}
              cy={p[1]}
              r={isDhaka ? 6.5 : 4}
              fill={isDhaka ? '#e9705a' : '#fff'}
              stroke='#fff'
              strokeWidth={isDhaka ? 2.5 : 0}
            />
            <text className='lbl' x={p[0] + o[0]} y={p[1] + o[1]} textAnchor={o[2]}>
              {NM[k][0]}
            </text>
            <text className='lbl2' x={p[0] + o[0]} y={p[1] + o[1] + 9} textAnchor={o[2]}>
              {NM[k][1]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
