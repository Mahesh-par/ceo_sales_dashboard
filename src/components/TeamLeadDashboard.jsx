import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

function TeamLeadDashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/data/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }
      if (res.ok) setData(json);
      else setError(json.error);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = async (id, field, value) => {
    setData(current => current ? ({
      ...current,
      team: {
        ...current.team,
        bidders: current.team.bidders.map(bidder => ({
          ...bidder,
          rows: bidder.rows.map(row => row.id === id ? { ...row, [field]: value } : row)
        }))
      }
    }) : current);
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/api/rows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ [field]: value })
    });
    fetchDashboard();
  };
  
  const rollForward = async () => {
    alert('Roll forward functionality will lock current week and increment weekNo.');
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const team = data.team;
  const stats = team.stats;
  const teamBids = team.bidders.reduce((sum, bidder) => sum + (bidder.dailyBidCounts || []).reduce((s, r) => s + Number(r.totalBids || 0), 0), 0);

  // Compute big fish candidates for follow-up (e.g., Open & value > threshold)
  const allRows = team.bidders.flatMap(b => b.rows);
  const followUps = allRows.filter(r => 
    r.status !== 'Converted' && parseFloat(r.quoted || r.budget || 0) >= data.state.thresh
  ).sort((a, b) => parseFloat(b.quoted || b.budget || 0) - parseFloat(a.quoted || a.budget || 0));

  return (
    <div className="sheet">
      <div className="toolbar">
        <img className="toolbar-brand" src="/10turtle-wordmark.svg" alt="10turtle" />
        <button className="btn ghost" onClick={onLogout}>Logout</button>
      </div>

      <header className="masthead">
        <h1 className="report-title">{team.name}</h1>
        <div className="accent-rule"></div>
        <div className="mh-foot">
          <div><span className="f-lab">Week</span><span className="f-val">{data.state.weekFrom} to {data.state.weekTo}</span></div>
          <div><span className="f-lab">Pipeline Threshold</span><span className="f-val">${data.state.thresh}</span></div>
        </div>
      </header>

      <section>
        <div className="sec-head"><span className="sec-num">01</span><span className="sec-label">Team snapshot</span></div>
        <h2 className="sec-title">The team's week so far</h2>
        <div className="stats grid-4">
          <div className="stat">
            <div className="s-lab">Bids</div>
            <div className="s-row"><div className="big">{teamBids}</div></div>
            <div className="s-sub"></div>
          </div>
          <div className="stat">
            <div className="s-lab">Response</div>
            <div className="s-row"><div className="big">{stats.clients}</div></div>
            <div className="s-sub">{stats.fresh} fresh · {stats.hourly} hourly</div>
          </div>
          <div className="stat">
            <div className="s-lab">Open Pipeline</div>
            <div className="s-row"><span className="cur">$</span><div className="big">{stats.pipeline.toLocaleString()}</div></div>
            <div className="s-sub">{stats.big} big tickets over ${data.state.thresh}</div>
          </div>
          <div className="stat accent">
            <div className="s-lab">Revenue Won</div>
            <div className="s-row"><span className="cur">$</span><div className="big">{stats.revenue.toLocaleString()}</div></div>
            <div className="s-sub">{stats.Converted} converted ({(stats.conv * 100).toFixed(0)}%)</div>
          </div>
        </div>
      </section>

      {followUps.length > 0 && (
        <section>
          <div className="sec-head"><span className="sec-num">02</span><span className="sec-label">Follow up</span></div>
          <h2 className="sec-title">Big tickets to chase</h2>
          <p className="sec-note">Every active row in your team worth over ${data.state.thresh}. <b>The last column is your note to the bidder.</b></p>
          <div className="wrapscroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Client</th>
                  <th style={{ width: '10%' }}>Bidder</th>
                  <th className="r" style={{ width: '10%' }}>Worth</th>
                  <th className="c" style={{ width: '8%' }}>Int.</th>
                  <th className="c" style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '45%' }}>Your instruction to bidder</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map(r => {
                  const bidder = team.bidders.find(b => b.id === r.bidderId);
                  return (
                    <tr key={`fu-${r.id}`} className={r.status === 'Open' ? 'fish' : ''}>
                      <td>{r.client}</td>
                      <td>{bidder?.name}</td>
                      <td className="r">${r.quoted || r.budget}</td>
                      <td className="c">{r.interviews}</td>
                      <td className="c"><span className={`tag auto`}>{r.status}</span></td>
                      <td>
                        <input 
                          className="f" 
                          placeholder="Write a follow-up note..." 
                          value={r.note || ''} 
                          onChange={e => updateRow(r.id, 'note', e.target.value)} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <div className="sec-head"><span className="sec-num">03</span><span className="sec-label">Bidder by bidder</span></div>
        <h2 className="sec-title">Everyone's entries</h2>
        <p className="sec-note">You can edit any field here. Your changes are saved immediately and the bidder sees them.</p>
        
        {team.bidders.map(bidder => {
          const bidderBids = (bidder.dailyBidCounts || []).reduce((sum, r) => sum + Number(r.totalBids || 0), 0);
          return (
          <div className="bidder" key={bidder.id}>
            <div className="b-head">
              <div className="b-id">
                <div className="b-name">{bidder.name} {bidder.direct === 1 ? '(Direct)' : ''}</div>
              </div>
              <div className="b-figs">
                <div className="b-fig"><div className="bf-lab">Bids</div><div className="bf-val">{bidderBids}</div></div>
                <div className="b-fig"><div className="bf-lab">Response</div><div className="bf-val">{bidder.stats.clients}</div></div>
                <div className="b-fig"><div className="bf-lab">Pipeline</div><div className="bf-val"><span className="cur">$</span>{bidder.stats.pipeline.toLocaleString()}</div></div>
                <div className="b-fig"><div className="bf-lab">Won</div><div className="bf-val" style={{ color: 'var(--s-won-d)' }}><span className="cur">$</span>{bidder.stats.revenue.toLocaleString()}</div></div>
              </div>
            </div>
            <div className="wrapscroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Client</th>
                    <th style={{ width: '21%' }}>Remarks</th>
                    <th className="c" style={{ width: '12%' }}>Type</th>
                    <th className="r" style={{ width: '8%' }}>Budget</th>
                    <th className="r" style={{ width: '8%' }}>Quoted</th>
                    <th className="c" style={{ width: '6%' }}>Int.</th>
                    <th className="c" style={{ width: '17%' }}>Status</th>
                    <th style={{ width: '13%' }}>TL note</th>
                  </tr>
                </thead>
                <tbody>
                  {bidder.rows.map(r => (
                    <tr key={r.id}>
                      <td><input className="f" value={r.client || ''} onChange={e => updateRow(r.id, 'client', e.target.value)} /></td>
                      <td><input className="f" value={r.remarks || ''} onChange={e => updateRow(r.id, 'remarks', e.target.value)} /></td>
                      <td className="c">
                        <select className="f slim" value={r.type} onChange={e => updateRow(r.id, 'type', e.target.value)}>
                          <option>Fixed</option>
                          <option>Hourly</option>
                          <option>Hourly bid, fixed quote</option>
                        </select>
                      </td>
                      <td className="r"><input className="f num" value={r.budget || ''} onChange={e => updateRow(r.id, 'budget', e.target.value)} /></td>
                      <td className="r"><input className="f num" value={r.quoted || ''} onChange={e => updateRow(r.id, 'quoted', e.target.value)} /></td>
                      <td className="c"><input className="f cen" value={r.interviews || ''} onChange={e => updateRow(r.id, 'interviews', e.target.value)} /></td>
                      <td className="c statcell">
                        <select className={`f st-${r.status === 'Converted' ? 'won' : r.status === 'Hired elsewhere' ? 'lost' : r.status === 'Job post deleted' || r.status === 'Client ended conversation' ? 'dead' : 'open'}`} value={r.status} onChange={e => updateRow(r.id, 'status', e.target.value)}>
                          <option>Open</option>
                          <option>Converted</option>
                          <option>Hired elsewhere</option>
                          <option>Job post deleted</option>
                          <option>Client ended conversation</option>
                        </select>
                      </td>
                      <td><input className="f" value={r.note || ''} onChange={e => updateRow(r.id, 'note', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: '40px' }}>
          <button className="btn ghost" onClick={rollForward}>Roll forward week</button>
        </div>
      </section>
    </div>
  );
}

export default TeamLeadDashboard;
