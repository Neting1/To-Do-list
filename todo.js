document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('taskDetailsModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const closeIcon = document.getElementById('closeModalIcon');
    // Ensure modal is defined before querying its elements
    const updateBtn = modal ? modal.querySelector('.btn-update') : null; 
    
    const taskList = document.getElementById('taskList');
    const filterButtons = document.querySelectorAll('.filter-tabs .tab-button');
    const taskForm = document.getElementById('taskForm');
    
    // Tracks the ID of the task currently being edited (null for new tasks)
    let currentTaskIdBeingEdited = null; 

    // --- Local Storage & Data Management ---
    
    const STORAGE_KEY = 'todoAppTasks';

    const loadTasks = () => {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        if (storedTasks) {
            return JSON.parse(storedTasks);
        } 
        
        // Initial default tasks if local storage is empty
        const initialTasks = [
            { id: `task-${Date.now() - 3000}`, title: "Draft Project Proposal", deadline: "2025-10-17T10:00", priority: "High", completed: false },
            { id: `task-${Date.now() - 2000}`, title: "Take Trash Out", deadline: "2025-10-18T18:00", priority: "Low", completed: false },
            { id: `task-${Date.now() - 1000}`, title: "Get Groceries", deadline: "2025-10-19T14:30", priority: "Medium", completed: true }, // Set one as completed initially
            { id: `task-${Date.now()}`, title: "Send Mail", deadline: "2025-10-25T11:00", priority: "Low", completed: false },
        ];
        
        saveTasks(initialTasks);
        return initialTasks;
    };

    const saveTasks = (tasks) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    };

    let tasks = loadTasks();

    // --- Utility Functions ---

    const getTodayDate = () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    };
    
    // Note: completed tasks are not filtered by date status, 
    // but the task list currently doesn't separate completed/incomplete tasks by status, 
    // only visibility based on completion (which isn't implemented yet, but for now we focus on data integrity).
    const getTaskStatus = (taskDateString) => {
        if (!taskDateString) return 'pending';
        
        const today = getTodayDate();
        // Use only the date part for comparison to match filter logic (YYYY-MM-DD)
        const datePart = taskDateString.split('T')[0];
        const dueDate = new Date(datePart);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() < today.getTime()) {
            return 'overdue';
        } else if (dueDate.getTime() === today.getTime()) {
            return 'today';
        } else {
            return 'pending';
        }
    };

    const formatDateForDisplay = (dateTimeLocalString) => {
        if (!dateTimeLocalString) return 'No Deadline';
        
        const date = new Date(dateTimeLocalString);
        if (isNaN(date)) return 'Invalid Date';
        
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    // --- DOM Manipulation (Rendering) ---
    
    const createNewTaskElement = (taskData) => {
        const { id, title, deadline, priority, completed } = taskData;
        
        const dueDateDisplay = formatDateForDisplay(deadline);
        // Use only the date part (YYYY-MM-DD) for the data attribute used by filtering
        const dataDueDate = deadline ? deadline.split('T')[0] : ''; 
        const priorityClass = (priority || '').toLowerCase();

        const listItem = document.createElement('li');
        listItem.classList.add('task-item');
        listItem.setAttribute('data-due-date', dataDueDate);
        listItem.setAttribute('data-id', id); // Add task ID to the list item
        // If completed, add a class to distinguish it
        if (completed) listItem.classList.add('task-completed');

        listItem.innerHTML = `
            <input type="checkbox" id="${id}" ${completed ? 'checked' : ''}>
            <label for="${id}" class="task-text">${title}</label>
            <span class="task-due-date"><i class="far fa-clock"></i> ${dueDateDisplay}</span>
            <div class="task-actions">
                <i class="fas fa-pencil-alt edit-icon"></i>
                <i class="fas fa-trash-alt delete-icon"></i>
                <span class="priority-indicator ${priorityClass}"></span>
            </div>
        `;
        
        return listItem;
    };

    const renderTasks = () => {
        // Clear both lists (active tasks and completed tasks)
        taskList.innerHTML = '';
        const completedList = document.getElementById('completedList');
        if (completedList) completedList.innerHTML = '';

        // Render tasks: non-completed in the main list, completed in the completed list
        tasks.forEach(task => {
            const element = createNewTaskElement(task);
            if (task.completed) {
                if (completedList) completedList.appendChild(element);
            } else {
                taskList.prepend(element); // newest first
            }
        });

        // Show/hide completed section depending on whether there are completed tasks
        const completedTitle = document.querySelector('.completed-title');
        if (completedList && completedTitle) {
            if (completedList.children.length === 0) {
                completedTitle.style.display = 'none';
                completedList.style.display = 'none';
            } else {
                // Respect collapsed state if set, otherwise default to expanded
                completedTitle.style.display = '';
                const collapsed = completedTitle.dataset.collapsed === 'true';
                if (collapsed) {
                    completedList.style.display = 'none';
                    const arrow = completedTitle.querySelector('.arrow'); if (arrow) arrow.textContent = '▼';
                } else {
                    completedList.style.display = '';
                    const arrow = completedTitle.querySelector('.arrow'); if (arrow) arrow.textContent = '▲';
                }
            }
        }

        const activeFilter = document.querySelector('.tab-button.active') ?
                             document.querySelector('.tab-button.active').getAttribute('data-status') :
                             'today';
        filterTasks(activeFilter);
    };

    // --- Core Functionality ---

    // 1. Task Filtering Logic
    const filterTasks = (filterStatus) => {
        // Only filter non-completed tasks (those in the main taskList)
        taskList.querySelectorAll('.task-item').forEach(taskItem => {
            const dueDateString = taskItem.getAttribute('data-due-date');
            const taskStatus = getTaskStatus(dueDateString);

            let isVisible = false;

            if (filterStatus === 'today' && taskStatus === 'today') {
                isVisible = true;
            } else if (filterStatus === 'pending' && taskStatus === 'pending') {
                isVisible = true;
            } else if (filterStatus === 'overdue' && taskStatus === 'overdue') {
                isVisible = true;
            }

            if (isVisible) {
                taskItem.classList.remove('hidden');
            } else {
                taskItem.classList.add('hidden');
            }
        });
    };

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filterStatus = button.getAttribute('data-status');
            filterTasks(filterStatus);
        });
    });
    
    // 2. Task Submission Handler (Create or Update)
    const handleTaskSubmission = (e) => {
        e.preventDefault(); 
        
        const title = document.getElementById('taskTitle').value.trim();
        const deadline = document.getElementById('deadline').value;
        const priority = document.getElementById('priority').value;

        if (!title) {
            // NOTE: Per requirement, custom modal should be used instead of alert() in production.
            alert('Please enter a task title.');
            return;
        }
        
        if (currentTaskIdBeingEdited) {
            // Update Existing Task
            const taskIndex = tasks.findIndex(task => task.id === currentTaskIdBeingEdited);
            if (taskIndex !== -1) {
                // FIX: Preserve the existing completed status during update
                const existingTask = tasks[taskIndex];
                
                existingTask.title = title;
                existingTask.deadline = deadline;
                existingTask.priority = priority;
                // 'completed' status is preserved implicitly by only modifying fields from the form
            }
        } else {
            // Create New Task
            const newTaskData = {
                id: `task-${Date.now()}`,
                title: title,
                deadline: deadline,
                priority: priority,
                completed: false,
            };
            tasks.unshift(newTaskData); 
        }

        saveTasks(tasks);
        renderTasks(); 
        closeModal();
    };
    
    // Set up the listener for form submission
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmission);
    }


    // 3. Task Deletion & Editing Logic
    // Use delegated handlers attached to both task lists (active and completed)
    const handleListClick = (event) => {
        // Find the clicked task item (works if clicking the icon or its child)
        const taskItem = event.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = taskItem.getAttribute('data-id');
        const taskData = tasks.find(task => task.id === taskId);
        if (!taskData) return;

        // Use closest to allow clicks on nested elements inside the icon
        const deleteBtn = event.target.closest('.delete-icon');
        const editBtn = event.target.closest('.edit-icon');

        if (deleteBtn) {
            // Deletion Logic
            if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks(tasks);
                renderTasks();
            }
            return;
        }

        if (editBtn) {
            // Editing Logic
            openModalForEdit(taskData);
            return;
        }
    };

    // Attach delegated click handlers to both lists
    const completedListEl = document.getElementById('completedList');
    if (taskList) taskList.addEventListener('click', handleListClick);
    if (completedListEl) completedListEl.addEventListener('click', handleListClick);

    // FIX 1: Task Completion Toggle Logic
    const handleListChange = (event) => {
        if (event.target.type === 'checkbox') {
            const taskId = event.target.id;
            const isCompleted = event.target.checked;

            const taskIndex = tasks.findIndex(task => task.id === taskId);

            if (taskIndex !== -1) {
                tasks[taskIndex].completed = isCompleted;
                saveTasks(tasks);

                // Re-render to apply filtering and move item between lists
                renderTasks();
            }
        }
    };

    // Attach change listener to both lists (active and completed)
    if (taskList) taskList.addEventListener('change', handleListChange);
    const completedListEl2 = document.getElementById('completedList');
    if (completedListEl2) completedListEl2.addEventListener('change', handleListChange);

    // --- Modal Logic ---
    const openModalForEdit = (taskData) => {
        if (!modal || !taskForm || !updateBtn) return; // Guard for missing elements
        
        document.getElementById('taskTitle').value = taskData.title;
        document.getElementById('deadline').value = taskData.deadline || '';
        document.getElementById('priority').value = taskData.priority;
        // The comments field is not stored in data, so it remains blank.

        currentTaskIdBeingEdited = taskData.id;
        updateBtn.textContent = 'Update Task';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // Update clear-button visibility for priority select
        if (typeof setupPriorityClearButtons === 'function') setupPriorityClearButtons();
    };

    const openModalForNew = () => {
        if (!modal || !taskForm || !updateBtn) return; // Guard for missing elements
        
        taskForm.reset(); 
        currentTaskIdBeingEdited = null;
        updateBtn.textContent = 'Add Task';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        // Ensure clear button visibility is correct after reset
        if (typeof setupPriorityClearButtons === 'function') setupPriorityClearButtons();
    };
    
    const closeModal = () => {
        if (!modal || !taskForm) return; // Guard for missing elements
        
        currentTaskIdBeingEdited = null; // Reset context
        taskForm.reset(); 
        // FIX 3: Removed the unnecessary and potentially incorrect updateBtn.textContent reset.
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    if (openBtn) openBtn.addEventListener('click', openModalForNew);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeIcon) closeIcon.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (modal && event.target === modal) {
            closeModal();
        }
    });

    window.addEventListener('keydown', (event) => {
        if (modal && event.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
        }
    });
    
    // --- Clear (priority) button functionality ---
    // Ensures the small 'x' inside custom selects clears the select value and hides itself.
    const setupPriorityClearButtons = () => {
        document.querySelectorAll('.priority-close-x').forEach(btn => {
            const wrapper = btn.closest('.custom-select-wrapper');
            if (!wrapper) return;
            const select = wrapper.querySelector('select');
            if (!select) return;

            // If there's no empty option, insert a hidden empty option so we can clear to a true empty value.
            const hasEmptyOption = Array.from(select.options).some(o => o.value === '');
            if (!hasEmptyOption) {
                const emptyOpt = document.createElement('option');
                emptyOpt.value = '';
                emptyOpt.text = '';
                emptyOpt.hidden = true; // keep it out of the dropdown
                // Insert as the first option
                select.insertBefore(emptyOpt, select.firstChild);
            }

            const updateVisibility = () => {
                // Show button when there's a value selected (non-empty)
                if (select.value && select.value !== '') {
                    btn.style.display = '';
                } else {
                    btn.style.display = 'none';
                }
            };

            // Initial state
            updateVisibility();

            // Clicking the clear button resets the select and hides the button
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                select.value = '';
                // Notify any listeners
                select.dispatchEvent(new Event('change', { bubbles: true }));
                updateVisibility();
            });

            // Toggle visibility when the select changes
            select.addEventListener('change', updateVisibility);
        });
    };
    
    // --- Completed section toggle ---
    // Clicking the .completed-title header toggles the visibility of #completedList and flips the arrow
    const setupCompletedToggle = () => {
        const title = document.querySelector('.completed-title');
        const list = document.getElementById('completedList');
        if (!title || !list) return;

        // Avoid attaching multiple handlers
        if (title.dataset.toggleAttached === 'true') return;

        // Ensure a default collapsed state exists
        if (typeof title.dataset.collapsed === 'undefined') title.dataset.collapsed = 'false';

        title.addEventListener('click', () => {
            const collapsed = title.dataset.collapsed === 'true';
            if (collapsed) {
                // show
                list.style.display = '';
                const arrow = title.querySelector('.arrow'); if (arrow) arrow.textContent = '▲';
                title.dataset.collapsed = 'false';
            } else {
                // hide
                list.style.display = 'none';
                const arrow = title.querySelector('.arrow'); if (arrow) arrow.textContent = '▼';
                title.dataset.collapsed = 'true';
            }
        });

        title.dataset.toggleAttached = 'true';
    };
    
    // --- Initialization ---
    renderTasks();
    // Wire up priority clear buttons on initial load
    if (typeof setupPriorityClearButtons === 'function') setupPriorityClearButtons();
    // Wire up completed toggle
    if (typeof setupCompletedToggle === 'function') setupCompletedToggle();
});
