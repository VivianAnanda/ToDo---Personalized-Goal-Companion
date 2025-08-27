import React, { useState, useEffect } from "react";
import Marquee from 'react-fast-marquee';
import axios from "axios";
import ProfileDropdown from "./ProfileDropdown";
import { useNavigate } from "react-router-dom";

import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import advancedFormat from "dayjs/plugin/advancedFormat";
import isBetween from "dayjs/plugin/isBetween";

dayjs.extend(isToday);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);

function GoalForm() {
  // --- Task Completion Streak Calculation ---
  // (Moved below state declarations)

  // --- All useState hooks at the top ---
  const [editGoal, setEditGoal] = useState(null);
  const [singleEdit, setSingleEdit] = useState(null); // {goalId, dateKey, fields}
  const [statsPeriod, setStatsPeriod] = useState('today'); // 'today', 'week', 'month'
  const [confirmAction, setConfirmAction] = useState(null); // { type, goal, dateKey }
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recurrence, setRecurrence] = useState(""); // default blank
  const [message, setMessage] = useState("");
  const [goals, setGoals] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
    } else {
      fetchGoals();
    }
  }, [navigate]);

  // --- Helpers and stats code after hooks ---
  // Helper to check if a goal occurrence is completed
  const isCompleted = (goal, dateKey) => {
    const exceptions = goal.exceptions || [];
    if (goal.recurrence && goal.recurrence !== 'one-time') {
      // If there is an 'uncomplete' exception for this date, it's not completed
      if (exceptions.some(ex => ex.date === dateKey && ex.type === 'uncomplete')) return false;
      // Otherwise, completed if there is a 'complete' exception
      return exceptions.some(ex => ex.date === dateKey && ex.type === 'complete');
    }
    return goal.completed;
  };

  // Helper to get date range for stats
  function getStatsRange() {
    const now = dayjs();
    if (statsPeriod === 'today') {
      return { start: now.startOf('day'), end: now.endOf('day') };
    } else if (statsPeriod === 'week') {
      return { start: now.startOf('week'), end: now.endOf('week') };
    } else if (statsPeriod === 'month') {
      return { start: now.startOf('month'), end: now.endOf('month') };
    }
    return { start: now.startOf('day'), end: now.endOf('day') };
  }

  // Get stats range for current period
  const { start: statsStart, end: statsEnd } = getStatsRange();
  const statsGoals = goals.filter(goal => {
    if (goal.recurrence && goal.recurrence !== 'one-time') {
      // For recurring, show if any occurrence falls in range and is not deleted
      // For simplicity, assume recurring tasks are shown for every day in range unless deleted for that day
      // We'll count each day in the range as a separate occurrence
      return true;
    }
    // One-time: check deadline in range
    const deadlineDay = dayjs(goal.deadline);
    return deadlineDay.isBetween(statsStart, statsEnd, null, '[]');
  });

  // For recurring, count each day in the current calendar week/month as an occurrence unless deleted
  let totalOccurrences = 0;
  let completedOccurrences = 0;
  let remainingOccurrences = 0;
  const daysInRange = [];
  let cursor = statsStart.clone();
  const now = dayjs();
  while (cursor.isBefore(statsEnd) || cursor.isSame(statsEnd, 'day')) {
    daysInRange.push(cursor.format('YYYY-MM-DD'));
    cursor = cursor.add(1, 'day');
  }
  statsGoals.forEach(goal => {
    if (goal.recurrence && goal.recurrence !== 'one-time') {
      const createdAt = dayjs(goal.createdAt).startOf('day');
      daysInRange.forEach(dateKey => {
        const dayObj = dayjs(dateKey);
        if (dayObj.isBefore(createdAt, 'day')) return;
        const hasDelete = (goal.exceptions || []).some(ex => ex.date === dateKey && ex.type === 'delete');
        if (hasDelete) return;
        // Only count if the recurrence pattern matches this day
        const goalDate = dayjs(goal.deadline).startOf('day');
        let matches = false;
        if (goal.recurrence === 'daily') {
          matches = true;
        } else if (goal.recurrence === 'weekly') {
          matches = goalDate.day() === dayObj.day();
        } else if (goal.recurrence === 'monthly') {
          matches = goalDate.date() === dayObj.date();
        } else if (goal.recurrence === 'yearly') {
          matches = goalDate.date() === dayObj.date() && goalDate.month() === dayObj.month();
        }
        if (matches) {
          totalOccurrences++;
          if (isCompleted(goal, dateKey)) {
            completedOccurrences++;
          } else {
            remainingOccurrences++;
          }
        }
      });
    } else {
      const deadlineKey = dayjs(goal.deadline).format('YYYY-MM-DD');
      if (daysInRange.includes(deadlineKey)) {
        totalOccurrences++;
        if (isCompleted(goal, deadlineKey)) {
          completedOccurrences++;
        } else {
          remainingOccurrences++;
        }
      }
    }
  });
  // ...existing code...

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
    } else {
      fetchGoals();
    }
  }, [navigate]);

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/goals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to fetch goals", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation: prevent creating tasks in the past
    const now = new Date();
    const selectedDate = new Date(`${deadline}T${startTime}`);
    if (selectedDate < now) {
      setMessage('⚠️ Cannot create a task in the past.');
      return;
    }
    try {
      const token = localStorage.getItem("token");
      console.log('Submitting with recurrence:', recurrence);

      if (editMode && editGoal && singleEdit && singleEdit.goalId === editGoal._id && singleEdit.dateKey === deadline) {
        // Backend: add/modify exception for this occurrence
        await axios.post(
          `http://localhost:5000/api/goals/${editGoal._id}/exception`,
          {
            date: deadline,
            type: 'modify',
            override: Object.fromEntries(Object.entries({ title, category, priority, deadline, startTime, endTime, recurrence }).filter(([k, v]) => v !== undefined && v !== "")),
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage("✅ Only this occurrence modified");
        setEditMode(false);
        setEditGoal(null);
        setSingleEdit(null);
        setTitle("");
        setCategory("");
        setDeadline("");
        setStartTime("");
        setEndTime("");
        fetchGoals();
        return;
      }
      if (editMode && editGoal) {
        // Only send fields that are different from the current goal
        const updates = {};
        if (title !== editGoal.title) updates.title = title;
        if (category !== editGoal.category) updates.category = category;
        if (priority !== editGoal.priority) updates.priority = priority;
        if (deadline !== (editGoal.deadline ? dayjs(editGoal.deadline).format('YYYY-MM-DD') : '')) updates.deadline = deadline;
        if (startTime !== editGoal.startTime) updates.startTime = startTime;
        if (endTime !== editGoal.endTime) updates.endTime = endTime;
  if (recurrence && recurrence !== editGoal.recurrence) updates.recurrence = recurrence;
        if (Object.keys(updates).length === 0) {
          setMessage('⚠️ No changes detected.');
          return;
        }
        await axios.put(
          `http://localhost:5000/api/goals/${editGoal._id}`,
          updates,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        setMessage("✅ Goal updated!");
        setEditMode(false);
        setEditGoal(null);
        setSingleEdit(null); // <-- Ensure this is always reset
        fetchGoals();
        return; // <-- Prevent any further state changes after update
      } else {
        await axios.post(
          "http://localhost:5000/api/goals/create",
          { title, category, priority, deadline, startTime, endTime, recurrence },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        setMessage("🎉 Goal created successfully!");
        fetchGoals();
      }
      setTitle("");
  setCategory("");
  setPriority("");
      setDeadline("");
      setStartTime("");
      setEndTime("");
      setRecurrence("");
      setSingleEdit(null);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || "⚠️ Error occurred.";
      setMessage(`⚠️ ${errorMsg}`);
    }
  };


  // Show confirmation dialog for recurring tasks
  const handleDelete = (goal, dateKey) => {
    console.log('handleDelete:', {recurrence: goal.recurrence, goal});
    if (goal.recurrence && goal.recurrence !== 'one-time') {
      setConfirmAction({ type: 'delete', goal, dateKey });
    } else {
      confirmDelete('single', goal, dateKey);
    }
  };

  const confirmDelete = async (scope, goal, dateKey) => {
    setConfirmAction(null);
    try {
      const token = localStorage.getItem("token");
      if (scope === 'single' && goal.recurrence && goal.recurrence !== 'one-time') {
        // Backend: add delete exception for this occurrence
        await axios.post(
          `http://localhost:5000/api/goals/${goal._id}/exception`,
          { date: dateKey, type: 'delete' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchGoals();
        return;
      } else if (scope === 'single' || !goal.recurrence || goal.recurrence === 'one-time') {
        await axios.delete(`http://localhost:5000/api/goals/${goal._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (scope === 'all') {
        await axios.delete(`http://localhost:5000/api/goals/${goal._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (scope === 'future') {
        alert('Future occurrences deletion not implemented.');
        return;
      }
      fetchGoals();
    } catch (err) {
      console.error("Failed to delete goal", err);
    }
  };

  // Modify handler (for now, just show the popup, actual logic would need more backend support)

  const handleEditWithConfirm = (goal, dateKey) => {
    console.log('handleEditWithConfirm:', {recurrence: goal.recurrence, goal});
    if (goal.recurrence && goal.recurrence !== 'one-time') {
      setConfirmAction({ type: 'modify', goal, dateKey });
    } else {
      doEdit('single', goal, dateKey);
    }
  };

  // Called when user chooses 'all' or 'single' in the confirmation dialog
  const doEditConfirmed = async (scope, goal, dateKey) => {
    setConfirmAction(null);
    if (scope === 'all') {
      // Pre-fill the form fields with the current values from the recurring task
      setEditGoal(goal);
      setTitle(goal.title);
      setCategory(goal.category);
      setPriority(goal.priority || "");
      setDeadline(goal.deadline ? goal.deadline.split("T")[0] : "");
      setStartTime(goal.startTime);
      setEndTime(goal.endTime);
      setRecurrence(goal.recurrence || "");
      setEditMode(true);
      // The user will click Save Changes, which will trigger handleSubmit with editMode=true and editGoal set
    } else {
      doEdit(scope, goal, dateKey);
    }
  };

  const doEdit = (scope, goal, dateKey) => {
    setConfirmAction(null);
    if (scope === 'single' && goal.recurrence && goal.recurrence !== 'one-time') {
      // Frontend-only: allow editing just this occurrence
      setSingleEdit({
        goalId: goal._id,
        dateKey,
        fields: {
          title: goal.title,
          category: goal.category,
          deadline: dateKey,
          startTime: goal.startTime,
          endTime: goal.endTime,
        },
      });
      setTitle(goal.title);
      setCategory(goal.category);
      setDeadline(dateKey);
      setStartTime(goal.startTime);
      setEndTime(goal.endTime);
      setEditMode(true);
      setEditGoal(goal);
      return;
    } else if (scope === 'single' || !goal.recurrence || goal.recurrence === 'one-time') {
  setEditGoal(goal);
  setTitle(goal.title);
  setCategory(goal.category);
  setPriority(goal.priority || "");
  setDeadline(goal.deadline.split("T")[0]);
  setStartTime(goal.startTime);
  setEndTime(goal.endTime);
  setEditMode(true);
    } else if (scope === 'all') {
      setEditGoal(goal);
      setTitle(goal.title);
      setCategory(goal.category);
      setPriority(goal.priority || "");
      setDeadline(goal.deadline.split("T")[0]);
      setStartTime(goal.startTime);
      setEndTime(goal.endTime);
      setEditMode(true);
    } else if (scope === 'future') {
      alert('Future occurrences modification not implemented.');
    }
  };

  const handleComplete = async (id, dateKey, goal) => {
    try {
      const token = localStorage.getItem("token");
      if (isCompleted(goal, dateKey)) {
        // If already completed, toggle to incomplete
        if (goal.recurrence && goal.recurrence !== 'one-time') {
          // Remove the 'complete' exception for this occurrence
          await axios.post(
            `http://localhost:5000/api/goals/${id}/exception`,
            { date: dateKey, type: 'uncomplete' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          // One-time: PATCH to incomplete endpoint (you may need to implement this backend)
          await axios.patch(`http://localhost:5000/api/goals/${id}/incomplete`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } else {
        // Mark as complete (existing logic)
        if (goal.recurrence && goal.recurrence !== 'one-time') {
          await axios.post(
            `http://localhost:5000/api/goals/${id}/complete-occurrence`,
            { date: dateKey },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          await axios.patch(`http://localhost:5000/api/goals/${id}/complete`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
      fetchGoals();
    } catch (err) {
      console.error("Failed to toggle complete/incomplete", err);
    }
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setTitle(goal.title);
  setCategory(goal.category);
  setPriority(goal.priority || "");
    setDeadline(goal.deadline.split("T")[0]);
    setStartTime(goal.startTime);
    setEndTime(goal.endTime);
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditGoal(null);
    setTitle("");
    setCategory("");
    setDeadline("");
    setStartTime("");
    setEndTime("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const groupGoalsByDate = (goalsArr) => {
    // Show all one-time and recurring tasks for the next 7 days
    const today = dayjs().startOf('day');
    const days = Array.from({ length: 8 }, (_, i) => today.add(i, 'day'));
    const grouped = {};

    days.forEach(day => {
      const dateKey = day.format('YYYY-MM-DD');
      goalsArr.forEach(goal => {
        // Use backend exceptions
        const exceptions = goal.exceptions || [];
        if (exceptions.some(ex => ex.date === dateKey && ex.type === 'delete')) return;
        const modifyEx = exceptions.find(ex => ex.date === dateKey && ex.type === 'modify');
        const recurrenceType = goal.recurrence || 'one-time';
        const goalDate = dayjs(goal.deadline).startOf('day');
        let instance = goal;
        if (modifyEx) {
          instance = { ...goal, ...modifyEx.override, deadline: day.toISOString() };
        }
        if (recurrenceType === 'one-time') {
          if (goalDate.isSame(day)) {
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(instance);
          }
        } else if (recurrenceType === 'daily') {
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push({ ...instance, deadline: day.toISOString() });
        } else if (recurrenceType === 'weekly') {
          if (goalDate.day() === day.day()) {
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({ ...instance, deadline: day.toISOString() });
          }
        } else if (recurrenceType === 'monthly') {
          if (goalDate.date() === day.date()) {
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({ ...instance, deadline: day.toISOString() });
          }
        } else if (recurrenceType === 'yearly') {
          if (goalDate.date() === day.date() && goalDate.month() === day.month()) {
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({ ...instance, deadline: day.toISOString() });
          }
        }
      });
    });

    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => {
        const aTime = new Date(`${dateKey}T${a.startTime}:00`);
        const bTime = new Date(`${dateKey}T${b.startTime}:00`);
        return aTime - bTime;
      });
    });

    return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  };

  // Add modal styles
  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000
  };
  const modalContentStyle = {
    background: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    minWidth: 350,
    maxWidth: 500,
    boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
  };

  const completionStreak = calculateStreak(goals, isCompleted);
  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <ProfileDropdown onLogout={handleLogout} />
      </div>

      {/* Modal for editing a task */}
      {editMode && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h2>Modifying Task</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Goal Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <br />
              <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
              <br />
              <label>
                Task Priority:
                <select value={priority} onChange={e => setPriority(e.target.value)} required>
                  <option value="" disabled>Select priority</option>
                  <option value="urgent">Urgent (Highest)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Lowest)</option>
                </select>
              </label>
              <br />
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
              <br />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              <br />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              <br />
              <label>
                Recurrence:
                <select
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value)}
                  required
                  disabled={editMode && (editGoal && editGoal.recurrence && editGoal.recurrence !== 'one-time')}
                >
                  <option value="" disabled>Select recurrence</option>
                  <option value="one-time">One-time (individual task)</option>
                  <option value="daily">Every day at this time</option>
                  <option value="weekly">Every week on this day and time</option>
                  <option value="monthly">Every month on this day and time</option>
                  <option value="yearly">Every year on this day and time</option>
                </select>
              </label>
              <br />
              <button type="submit">Save Changes</button>
              <button onClick={handleCancelEdit} style={{ marginLeft: "1rem" }} type="button">Cancel</button>
            </form>
            <p>{message}</p>
          </div>
        </div>
      )}

      {/* Only show the create form if not editing */}
      {!editMode && (
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid #ccc",
              padding: "1rem",
              borderRadius: "8px",
              background: '#fff',
            }}
          >
            <h2>Create a New Goal</h2>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Goal Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <br />
              <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} required />
              <br />
              <label>
                Task Priority:
                <select value={priority} onChange={e => setPriority(e.target.value)} required>
                  <option value="" disabled>Select priority</option>
                  <option value="urgent">Urgent (Highest)</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low (Lowest)</option>
                </select>
              </label>
              <br />
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
              <br />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              <br />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
              <br />
              <label>
                Recurrence:
                <select
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value)}
                  required
                >
                  <option value="" disabled>Select recurrence</option>
                  <option value="one-time">One-time (individual task)</option>
                  <option value="daily">Every day at this time</option>
                  <option value="weekly">Every week on this day and time</option>
                  <option value="monthly">Every month on this day and time</option>
                  <option value="yearly">Every year on this day and time</option>
                </select>
              </label>
              <br />
              <button type="submit">Create Goal</button>
            </form>
            <p>{message}</p>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid #ccc",
              padding: "1rem",
              borderRadius: "8px",
              background: '#f9f9f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#222',
              fontSize: '1.2rem',
              fontWeight: 500,
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Stats</div>
            <div style={{ width: '100%', marginBottom: 12 }}>
              {/* Marquee for weekly reflection */}
              <div style={{ marginBottom: 8, width: '100%' }}>
                <div style={{ borderRadius: 6, overflow: 'hidden', background: '#e3f2fd', padding: '2px 0', width: '100%' }}>
                  <Marquee gradient={false} speed={40} style={{ fontWeight: 600, color: '#1976d2', fontSize: '1rem', width: '100%' }}>
                    Weekly Reflection: What did you accomplish? What can you improve next week? Celebrate your wins and set new goals!
                  </Marquee>
                </div>
              </div>
              <button onClick={() => setStatsPeriod('today')} style={{ fontWeight: statsPeriod==='today'?700:400, marginRight: 8 }}>Today</button>
              <button onClick={() => setStatsPeriod('week')} style={{ fontWeight: statsPeriod==='week'?700:400, marginRight: 8 }}>This Week</button>
              <button onClick={() => setStatsPeriod('month')} style={{ fontWeight: statsPeriod==='month'?700:400 }}>This Month</button>
            </div>
            <div>Total tasks: <span style={{ fontWeight: 600 }}>{totalOccurrences}</span></div>
            <div>Completed: <span style={{ color: 'green', fontWeight: 600 }}>{completedOccurrences}</span></div>
            <div>Remaining: <span style={{ color: 'orange', fontWeight: 600 }}>{remainingOccurrences}</span></div>
            <div>Task Completion Streak: <span style={{ color: '#007bff', fontWeight: 700 }}>{completionStreak}x</span></div>
            <button onClick={() => navigate('/detailed-stats')} style={{ marginTop: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(25, 118, 210, 0.08)' }}>
              See Detailed Stats
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h3>🗓️ Your Goals</h3>
        {goals.length === 0 ? (
          <p>No goals found. Add a new one above.</p>
        ) : (
          groupGoalsByDate(goals).map(([dateKey, dayGoals]) => {
            // Filter out tasks for which the day and end time have passed
            const now = dayjs();
            const filteredGoals = dayGoals.filter(goal => {
              const endDateTime = dayjs(`${dateKey}T${goal.endTime}:00`);
              return endDateTime.isAfter(now);
            });
            if (filteredGoals.length === 0) return null;
            return (
              <div key={dateKey} style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
                <h4>{dayjs(dateKey).isToday() ? "Today" : dayjs(dateKey).format("MMM D, YYYY")}</h4>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {filteredGoals.map((goal) => (
                    <li
                      key={goal._id}
                      style={{
                        marginBottom: "1rem",
                        padding: "0.5rem",
                        borderRadius: "6px",
                        backgroundColor: isCompleted(goal, dateKey) ? "#d4edda" : "transparent",
                        border: "1px solid #ccc",
                      }}
                    >
                      <div>
                        <strong>{goal.title}</strong> — {goal.category}
                        <span style={{ marginLeft: 8, fontWeight: 500, color: '#007bff' }}>
                          [Priority: {goal.priority ? goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1) : 'N/A'}]
                        </span>
                        <br />
                        🕒 {dayjs(`${dateKey}T${goal.startTime}:00`).format("h:mm A")} to{" "}
                        {dayjs(`${dateKey}T${goal.endTime}:00`).format("h:mm A")}
                        {isCompleted(goal, dateKey) && (
                          <span style={{ marginLeft: "1rem", color: "green", fontWeight: "bold" }}>✓ Task Completed</span>
                        )}
                      </div>
                      <div style={{ marginTop: "0.5rem" }}>
                        <button onClick={() => handleDelete(goal, dateKey)}>🗑️ Delete</button>
                        <button onClick={() => handleComplete(goal._id, dateKey, goal)} style={{ marginLeft: "0.5rem" }}>
                          ✅ Complete
                        </button>
                        <button onClick={() => handleEditWithConfirm(goal, dateKey)} style={{ marginLeft: "0.5rem" }}>
                          ✏️ Modify
                        </button>
      {/* Confirmation Dialog for Recurring Task Actions */}
      {confirmAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3>{confirmAction.type === 'delete' ? 'Delete Task' : 'Modify Task'}</h3>
            <p>Do you want to {confirmAction.type} just this occurrence, all occurrences, or cancel?</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => confirmAction.type === 'delete' ? confirmDelete('single', confirmAction.goal, confirmAction.dateKey) : doEditConfirmed('single', confirmAction.goal, confirmAction.dateKey)}>
                Just this occurrence
              </button>
              <button onClick={() => confirmAction.type === 'delete' ? confirmDelete('all', confirmAction.goal, confirmAction.dateKey) : doEditConfirmed('all', confirmAction.goal, confirmAction.dateKey)}>
                All occurrences
              </button>
              <button onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// --- Task Completion Streak Calculation ---
// Streak: number of consecutive days (up to today) where all tasks were completed
function calculateStreak(goals, isCompleted) {
  let streak = 0;
  const today = dayjs().startOf('day');
  // Build a list of days (up to today) with at least one scheduled task, in reverse chronological order
  let daysWithTasks = [];
  for (let i = 0; i < 365; i++) {
    const day = today.subtract(i, 'day');
    const dateKey = day.format('YYYY-MM-DD');
    let hasTask = false;
    for (const goal of goals) {
      if (day.isBefore(dayjs(goal.createdAt).startOf('day'))) continue;
      const exceptions = goal.exceptions || [];
      if (exceptions.some(ex => ex.date === dateKey && ex.type === 'delete')) continue;
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        // Only count if this recurrence actually occurs on this day
        const goalDate = dayjs(goal.deadline).startOf('day');
        if (
          (goal.recurrence === 'daily') ||
          (goal.recurrence === 'weekly' && goalDate.day() === day.day()) ||
          (goal.recurrence === 'monthly' && goalDate.date() === day.date()) ||
          (goal.recurrence === 'yearly' && goalDate.date() === day.date() && goalDate.month() === day.month())
        ) {
          hasTask = true;
        }
      } else {
        const deadlineKey = dayjs(goal.deadline).format('YYYY-MM-DD');
        if (deadlineKey === dateKey) hasTask = true;
      }
    }
    if (hasTask) daysWithTasks.push(dateKey);
  }
  // Count streak: for each day with tasks, all must be completed, or streak breaks
  for (const dateKey of daysWithTasks) {
    let allCompleted = true;
    for (const goal of goals) {
      if (dayjs(dateKey).isBefore(dayjs(goal.createdAt).startOf('day'))) continue;
      const exceptions = goal.exceptions || [];
      if (exceptions.some(ex => ex.date === dateKey && ex.type === 'delete')) continue;
      if (goal.recurrence && goal.recurrence !== 'one-time') {
        const goalDate = dayjs(goal.deadline).startOf('day');
        let matches = false;
        if (
          (goal.recurrence === 'daily') ||
          (goal.recurrence === 'weekly' && goalDate.day() === dayjs(dateKey).day()) ||
          (goal.recurrence === 'monthly' && goalDate.date() === dayjs(dateKey).date()) ||
          (goal.recurrence === 'yearly' && goalDate.date() === dayjs(dateKey).date() && goalDate.month() === dayjs(dateKey).month())
        ) {
          matches = true;
        }
        if (matches && !isCompleted(goal, dateKey)) allCompleted = false;
      } else {
        const deadlineKey = dayjs(goal.deadline).format('YYYY-MM-DD');
        if (deadlineKey === dateKey && !isCompleted(goal, dateKey)) allCompleted = false;
      }
    }
    if (allCompleted) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default GoalForm;
