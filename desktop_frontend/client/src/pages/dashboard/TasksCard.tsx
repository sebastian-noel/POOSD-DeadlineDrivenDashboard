import type { Task } from '../../types';
import { Icon } from '../../components/Icon';

interface TasksCardProps {
  tasks: Task[];
  doneCount: number;
  totalCount: number;
  onToggle: (id: string) => void;
  onAddTask: () => void;
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <li className="task-row">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`Mark "${task.label}" as ${task.done ? 'not done' : 'done'}`}
        className={`task-check${task.done ? ' checked' : ''}`}
        onClick={() => onToggle(task.id)}
      >
        {task.done && <Icon name="check" size={14} />}
      </button>
      <span className={`flex-grow-1 ${task.done ? 't-body text-ink-secondary' : 't-body-bold'}`}>{task.label}</span>
      <span className="task-tag">{task.tag}</span>
    </li>
  );
}

export function TasksCard({ tasks, doneCount, totalCount, onToggle, onAddTask }: TasksCardProps) {
  return (
    <section className="panel panel-milestones d-flex flex-column" style={{ gap: 14 }}>
      <header className="d-flex align-items-center justify-content-between">
        <h2 className="t-heading m-0">Today’s tasks</h2>
        <span className="t-body-bold text-ink-secondary">
          {doneCount} of {totalCount} done
        </span>
      </header>
      <ul className="task-list list-unstyled m-0 flex-grow-1">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} />
        ))}
        {tasks.length === 0 && <li className="t-body text-ink-secondary py-4 text-center">No tasks match.</li>}
      </ul>
      <div>
        <button type="button" className="btn-pill add-task-btn" onClick={onAddTask}>
          <Icon name="plus" size={18} />
          Add task
        </button>
      </div>
    </section>
  );
}
