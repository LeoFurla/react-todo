import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CardBody from './CardBody.jsx';

export default function SortableCard({ id, todo, tags, completed, onEdit, onDelete, onStatusChange }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...attributes}
            {...listeners}
            className={`touch-none ${isDragging ? 'opacity-30' : ''}`}
        >
            <CardBody todo={todo} tags={tags} completed={completed} onClick={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        </div>
    );
}
