import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import Marquee from 'react-fast-marquee';

function DetailedStats() {
  // All state and constants must be declared first
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [weekProgress, setWeekProgress] = useState(0);
  const [monthProgress, setMonthProgress] = useState(0);
  const [yearProgress, setYearProgress] = useState(0);
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [mostUsed, setMostUsed] = useState('');
  const [leastUsed, setLeastUsed] = useState('');
  const [priorityData, setPriorityData] = useState([]);
  const [dayData, setDayData] = useState([]);
  const [bestDay, setBestDay] = useState('');
  const [worstDay, setWorstDay] = useState('');
  const [moodData, setMoodData] = useState([]);
  const [moodSummary, setMoodSummary] = useState({});

  // Helper: get week number string (YYYY-WW)
  function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  }

  // Helper: get all weeks between two dates (inclusive)
  function getAllWeeksBetween(startDate, endDate) {
    const weeks = [];
    let current = new Date(startDate);
    current.setDate(current.getDate() - (current.getDay() || 7) + 1); // move to Monday
    while (current <= endDate) {
      weeks.push(getWeekNumber(new Date(current)));
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }
  // Mood Reflection (auto-generated from weekly completion)
  useEffect(() => {
    if (!goals || goals.length === 0) {
      setMoodData([]);
      setMoodSummary({});
      return;
    }
    const dayjs = require('dayjs');
    // Find the earliest and latest date in all goals
    let minDate = null, maxDate = null;
    goals.forEach(goal => {
      let created = goal.createdAt ? new Date(goal.createdAt) : null;
      let deadline = goal.deadline ? new Date(goal.deadline) : null;
      if (created && (!minDate || created < minDate)) minDate = created;
      if (deadline && (!maxDate || deadline > maxDate)) maxDate = deadline;
    });
    if (!minDate || !maxDate) {
      setMoodData([]);
      setMoodSummary({});
      return;
    }
    // Get all week numbers between minDate and maxDate
    const allWeeks = getAllWeeksBetween(minDate, maxDate);
    // For each week, calculate total and completed tasks
    const weekStats = {};
    allWeeks.forEach(week => {
      weekStats[week] = { total: 0, completed: 0 };
    });
    goals.forEach(goal => {
      // For recurring goals, count each occurrence in the week
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        const start = dayjs(goal.createdAt).startOf('day');
        const end = dayjs();
        let cursor = start.clone();
        while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
          const week = getWeekNumber(cursor.toDate());
          if (weekStats[week]) {
            const dateKey = cursor.format('YYYY-MM-DD');
            const hasDelete = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'delete');
            if (!hasDelete) {
              weekStats[week].total++;
              const isCompleted = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'complete');
              if (isCompleted) weekStats[week].completed++;
            }
          }
          cursor = cursor.add(1, 'day');
        }
      } else {
        // One-time goal
        if (goal.deadline) {
          const week = getWeekNumber(new Date(goal.deadline));
          if (weekStats[week]) {
            weekStats[week].total++;
            if (goal.completed) weekStats[week].completed++;
          }
        }
      }
    });
    // Map completion % to mood
    function getMood(pct) {
      if (pct >= 0.8) return '😊';
      if (pct >= 0.4) return '😐';
      return '😞';
    }
    const weekMoodTimeline = Object.entries(weekStats).map(([week, { total, completed }]) => {
      const pct = total === 0 ? 0 : completed / total;
      return { week, mood: getMood(pct), pct: Math.round(pct * 100) };
    });
    setMoodData(weekMoodTimeline);
    // Compute summary: number of weeks per mood type
    const summary = {};
    weekMoodTimeline.forEach(({ mood }) => {
      summary[mood] = (summary[mood] || 0) + 1;
    });
    setMoodSummary(summary);
  }, [goals]);
  const motivationalMessages = [
    "Keep going, you're doing great!",
    "Every small step counts.",
    "Reflect, reset, and rise again.",
    "Progress is progress, no matter how small.",
    "Celebrate your wins!"
  ];

  // Calculate priority analysis from goals data
  useEffect(() => {
    if (!goals.length) {
      setPriorityData([]);
      return;
    }
    const levels = ['Urgent', 'High', 'Medium', 'Low'];
    const stats = {};
    levels.forEach(lvl => stats[lvl] = { name: lvl, completed: 0, total: 0 });
    goals.forEach(goal => {
      let lvl = (goal.priority || 'Low').trim();
      lvl = lvl.charAt(0).toUpperCase() + lvl.slice(1).toLowerCase();
      if (!stats[lvl]) stats[lvl] = { name: lvl, completed: 0, total: 0 };
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        // Count only non-deleted occurrences from createdAt to today
        const dayjs = require('dayjs');
        let start = dayjs(goal.createdAt).startOf('day');
        let end = dayjs();
        let cursor = start.clone();
        while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
          const dateKey = cursor.format('YYYY-MM-DD');
          const hasDelete = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'delete');
          if (!hasDelete) {
            stats[lvl].total++;
            // Count as completed if there is a 'complete' exception for this date
            const isCompleted = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'complete');
            if (isCompleted) stats[lvl].completed++;
          }
          cursor = cursor.add(1, 'day');
        }
      } else {
        // One-time: only count if not deleted (i.e., not removed from DB)
        stats[lvl].total++;
        if (goal.completed) stats[lvl].completed++;
      }
    });
  // Always show all priorities, even if 0/0
  setPriorityData(levels.map(lvl => stats[lvl]));
  }, [goals]);

  // Calculate category breakdown from goals data
  useEffect(() => {
    if (!goals.length) {
      setCategoryData([]);
      setMostUsed('');
      setLeastUsed('');
      return;
    }
    // Count total occurrences (including recurrences) per category (all time)
    const dayjs = require('dayjs');
    const counts = {};
    goals.forEach(goal => {
      let cat = (goal.category || 'Uncategorized').trim();
      cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
      let occurrences = 0;
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        // Count all scheduled occurrences from createdAt to today
        let start = dayjs(goal.createdAt).startOf('day');
        let end = dayjs();
        let cursor = start.clone();
        while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
          const dateKey = cursor.format('YYYY-MM-DD');
          const hasDelete = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'delete');
          if (!hasDelete) occurrences++;
          cursor = cursor.add(1, 'day');
        }
      } else {
        occurrences = 1;
      }
      counts[cat] = (counts[cat] || 0) + occurrences;
    });
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
    setCategoryData(data);
    // Find most and least used
    if (data.length) {
      let most = data[0], least = data[0];
      data.forEach(d => {
        if (d.value > most.value) most = d;
        if (d.value < least.value) least = d;
      });
      setMostUsed(most.name);
      setLeastUsed(least.name);
    } else {
      setMostUsed('');
      setLeastUsed('');
    }
  }, [goals]);

  // Calculate best/worst days from goals data
  useEffect(() => {
    if (!goals.length) {
      setDayData([]);
      setBestDay('');
      setWorstDay('');
      return;
    }
    const dayjs = require('dayjs');
    // Count completions per weekday
    const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    goals.forEach(goal => {
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        (goal.exceptions || []).forEach(ex => {
          if (ex.type === 'complete') {
            const d = dayjs(ex.date);
            const wd = d.format('ddd');
            counts[wd] = (counts[wd] || 0) + 1;
          }
        });
      } else {
        if (goal.completed && goal.deadline) {
          const d = dayjs(goal.deadline);
          const wd = d.format('ddd');
          counts[wd] = (counts[wd] || 0) + 1;
        }
      }
    });
    const data = Object.entries(counts).map(([day, completed]) => ({ day, completed }));
    setDayData(data);
    // Find best/worst
    let best = '', worst = '', max = -1, min = 1e9;
    data.forEach(d => {
      if (d.completed > max) { max = d.completed; best = d.day; }
      if (d.completed < min) { min = d.completed; worst = d.day; }
    });
    setBestDay(best);
    setWorstDay(worst);
  }, [goals]);
  // Calculate streaks from goals data
  useEffect(() => {
    if (!goals.length) {
      setCurrentStreak(0);
      setLongestStreak(0);
      return;
    }
    const dayjs = require('dayjs');
    // Build a set of all completion dates
    const completedDates = new Set();
    goals.forEach(goal => {
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        // For recurring, check exceptions for 'complete'
        (goal.exceptions || []).forEach(ex => {
          if (ex.type === 'complete') completedDates.add(ex.date);
        });
      } else {
        if (goal.completed && goal.deadline) {
          const d = dayjs(goal.deadline).format('YYYY-MM-DD');
          completedDates.add(d);
        }
      }
    });
    // Find streaks up to today
    let streak = 0, maxStreak = 0;
    let today = dayjs().startOf('day');
    let cursor = today.clone();
    // Current streak: count back from today
    while (completedDates.has(cursor.format('YYYY-MM-DD'))) {
      streak++;
      cursor = cursor.subtract(1, 'day');
    }
    // Longest streak: scan all days from earliest to latest
    let allDates = Array.from(completedDates).sort();
    let prev = null, tempStreak = 0;
    allDates.forEach(dateStr => {
      if (!prev) {
        tempStreak = 1;
      } else {
        const prevDay = dayjs(prev);
        const currDay = dayjs(dateStr);
        if (currDay.diff(prevDay, 'day') === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > maxStreak) maxStreak = tempStreak;
      prev = dateStr;
    });
    setCurrentStreak(streak);
    setLongestStreak(maxStreak);
  }, [goals]);

  useEffect(() => {
    async function fetchGoals() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5000/api/goals", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGoals(data);
      } catch (err) {
        // eslint-disable-next-line
        console.error("Failed to fetch goals", err);
      }
    }
    fetchGoals();
  }, []);

  useEffect(() => {
    // Calculate progress for week, month, year
    const dayjs = require('dayjs');
    function getStatsRange(period) {
      const now = dayjs();
      if (period === 'week') {
        return { start: now.startOf('week'), end: now.endOf('week') };
      } else if (period === 'month') {
        return { start: now.startOf('month'), end: now.endOf('month') };
      } else if (period === 'year') {
        return { start: now.startOf('year'), end: now.endOf('year') };
      }
      return { start: now.startOf('day'), end: now.endOf('day') };
    }
    function calcProgress(period) {
      const { start, end } = getStatsRange(period);
      let total = 0, completed = 0;
      goals.forEach(goal => {
        if (goal.recurrence && goal.recurrence !== 'one-time') {
          let cursor = start.clone();
          while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
            const dateKey = cursor.format('YYYY-MM-DD');
            const createdAt = dayjs(goal.createdAt).startOf('day');
            if (cursor.isBefore(createdAt, 'day')) {
              cursor = cursor.add(1, 'day');
              continue;
            }
            const hasDelete = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'delete');
            if (!hasDelete) {
              total++;
              if ((goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'complete')) {
                completed++;
              } else if (goal.completed && (!goal.exceptions || !goal.exceptions.some(ex => ex.date === dateKey && ex.type === 'uncomplete'))) {
                completed++;
              }
            }
            cursor = cursor.add(1, 'day');
          }
        } else {
          const deadlineDay = dayjs(goal.deadline);
          if (deadlineDay.isBetween(start, end, null, '[]')) {
            total++;
            if (goal.completed) completed++;
          }
        }
      });
      return total === 0 ? 0 : completed / total;
    }
    setWeekProgress(calcProgress('week'));
    setMonthProgress(calcProgress('month'));
    setYearProgress(calcProgress('year'));
  }, [goals]);

  return (
    <div style={{ padding: "2rem", position: 'relative', minHeight: '100vh', background: '#f8faff' }}>
      <button
        style={{
          position: 'absolute',
          top: 24,
          right: 32,
          padding: '8px 18px',
          borderRadius: 6,
          background: '#2a3a5a',
          color: '#fff',
          border: 'none',
          fontWeight: 600,
          fontSize: '1em',
          cursor: 'pointer',
          zIndex: 10
        }}
        onClick={() => navigate('/goals')}
      >
        Home
      </button>
      <h2 style={{ marginTop: 0, textAlign: 'center' }}>Detailed Stats</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginTop: 32 }}>
        {/* Progress Bars */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 320, flex: '1 1 320px', maxWidth: 400 }}>
          <h3>Progress</h3>
          <div style={{ marginBottom: 12 }}>
            <span>This Week</span>
            <div style={{ background: '#e0e6ed', borderRadius: 8, height: 18, marginTop: 4 }}>
              <div style={{ width: `${weekProgress*100}%`, background: '#0088FE', height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
            <span style={{ float: 'right', fontWeight: 600 }}>{Math.round(weekProgress*100)}%</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span>This Month</span>
            <div style={{ background: '#e0e6ed', borderRadius: 8, height: 18, marginTop: 4 }}>
              <div style={{ width: `${monthProgress*100}%`, background: '#00C49F', height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
            <span style={{ float: 'right', fontWeight: 600 }}>{Math.round(monthProgress*100)}%</span>
          </div>
          <div>
            <span>This Year</span>
            <div style={{ background: '#e0e6ed', borderRadius: 8, height: 18, marginTop: 4 }}>
              <div style={{ width: `${yearProgress*100}%`, background: '#FFBB28', height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
            </div>
            <span style={{ float: 'right', fontWeight: 600 }}>{Math.round(yearProgress*100)}%</span>
          </div>
        </div>

        {/* Streaks */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 220, flex: '1 1 220px', maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3>Streaks</h3>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0088FE' }}>Current: {currentStreak} days</div>
          <div style={{ fontSize: 18, color: '#666', marginTop: 8 }}>Longest: {longestStreak} days</div>
        </div>

        {/* Category Pie Chart */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 320, flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {categoryData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, fontSize: 15 }}>
            <span style={{ color: '#0088FE', fontWeight: 600 }}>Most used:</span> {mostUsed} &nbsp;|&nbsp;
            <span style={{ color: '#FF8042', fontWeight: 600 }}>Least used:</span> {leastUsed}
          </div>
        </div>

        {/* Priority Analysis */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 320, flex: '1 1 320px', maxWidth: 400 }}>
          <h3>Priority Analysis</h3>
          {priorityData.map((p, idx) => {
            const percent = p.total === 0 ? 0 : (p.completed / p.total) * 100;
            return (
              <div key={p.name} style={{ marginBottom: 12 }}>
                <span>{p.name}</span>
                <div style={{ background: '#e0e6ed', borderRadius: 8, height: 16, marginTop: 4 }}>
                  <div style={{ width: `${percent}%`, background: COLORS[idx % COLORS.length], height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
                </div>
                <span style={{ float: 'right', fontWeight: 600 }}>{p.completed}/{p.total} done</span>
              </div>
            );
          })}
        </div>

        {/* Best/Worst Days */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 320, flex: '1 1 320px', maxWidth: 400 }}>
          <h3>Best/Worst Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12, fontSize: 15 }}>
            <span style={{ color: '#0088FE', fontWeight: 600 }}>Best:</span> {bestDay} &nbsp;|&nbsp;
            <span style={{ color: '#FF8042', fontWeight: 600 }}>Worst:</span> {worstDay}
          </div>
        </div>

        {/* Mood Reflection */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #e0e6ed', padding: 24, minWidth: 320, flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3>Mood Reflection</h3>
          {/* Mood summary - cleaned up, centered, no label */}
          <div style={{ marginBottom: 12, width: '100%', display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {Object.keys(moodSummary).length === 0 ? (
              <span style={{ fontSize: 16, color: '#aaa' }}>No mood data yet.</span>
            ) : (
              Object.entries(moodSummary).map(([mood, count]) => (
                <span key={mood} style={{ fontSize: 22, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{mood}</span>
                  <span style={{ fontSize: 16, fontWeight: 400, color: '#444' }}>{count} week{count > 1 ? 's' : ''}</span>
                </span>
              ))
            )}
          </div>
          {/* Mood timeline - centered and aligned */}
          <div style={{ display: 'flex', gap: 28, marginTop: 8, fontSize: 32, justifyContent: 'center', width: '100%' }}>
            {moodData.length === 0 && <span style={{ fontSize: 16, color: '#aaa' }}>No mood data yet.</span>}
            {moodData.map((m, idx) => (
              <div key={m.week} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
                <span>{m.mood}</span>
                <span style={{ fontSize: 13, color: '#888', marginTop: 2, textAlign: 'center' }}>{m.week} ({m.pct}%)</span>
              </div>
            ))}
          </div>
          <div style={{ width: '100%', marginTop: 18 }}>
            <Marquee gradient={false} speed={40} style={{ fontSize: 16, color: '#2a3a5a', fontWeight: 500 }}>
              {motivationalMessages.join('   •   ')}
            </Marquee>
          </div>
        </div>


      </div>
    </div>
  );
}

export default DetailedStats;
