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
        const priorityClass = priority.toLowerCase();
        
        const listItem = document.createElement('li');
        listItem.classList.add('task-item');
        listItem.setAttribute('data-due-date', dataDueDate);
        listItem.setAttribute('data-id', id); // Add task ID to the list item
        // If completed, add a class to distinguish it (not currently used for display, but good practice)
        if (completed) {
            listItem.classList.add('task-completed');
        }
        listItem.classList.add('hidden'); 

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
        taskList.innerHTML = '';
        // Prepend tasks so the newest/most recently added appear at the top
        tasks.forEach(task => {
            const element = createNewTaskElement(task);
            taskList.prepend(element);
        });
        
        const activeFilter = document.querySelector('.tab-button.active') ? 
                             document.querySelector('.tab-button.active').getAttribute('data-status') : 
                             'today';
        filterTasks(activeFilter);
    };

    // --- Core Functionality ---

    // 1. Task Filtering Logic
    const filterTasks = (filterStatus) => {
        taskList.querySelectorAll('.task-item').forEach(taskItem => {
            const dueDateString = taskItem.getAttribute('data-due-date');
            const taskStatus = getTaskStatus(dueDateString);
            
            // Get completion status from the rendered checkbox
            const checkbox = taskItem.querySelector('input[type="checkbox"]');
            const isCompleted = checkbox ? checkbox.checked : false;

            // Only show tasks that are NOT completed based on the current simple UI structure
            if (isCompleted) {
                taskItem.classList.add('hidden');
                return;
            }
            
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
    taskList.addEventListener('click', (event) => {
        const taskItem = event.target.closest('.task-item');
        if (!taskItem) return;

        const taskId = taskItem.getAttribute('data-id');
        const taskData = tasks.find(task => task.id === taskId);
        if (!taskData) return;

        if (event.target.classList.contains('delete-icon')) {
            // Deletion Logic
            // NOTE: Per requirement, custom modal should be used instead of confirm() in production.
            if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
                tasks = tasks.filter(task => task.id !== taskId);
                saveTasks(tasks);
                taskItem.remove();
                // No need to call renderTasks as the list item is removed directly
            }
        } else if (event.target.classList.contains('edit-icon')) {
            // Editing Logic
            openModalForEdit(taskData);
        }
    });

    // FIX 1: Task Completion Toggle Logic
    taskList.addEventListener('change', (event) => {
        if (event.target.type === 'checkbox') {
            const taskId = event.target.id;
            const isCompleted = event.target.checked;
            
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            
            if (taskIndex !== -1) {
                tasks[taskIndex].completed = isCompleted;
                saveTasks(tasks);
                
                // Re-render to apply filtering based on completion status
                renderTasks(); 
            }
        }
    });

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
    };

    const openModalForNew = () => {
        if (!modal || !taskForm || !updateBtn) return; // Guard for missing elements
        
        taskForm.reset(); 
        currentTaskIdBeingEdited = null;
        updateBtn.textContent = 'Add Task';
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
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
    
    // --- Initialization ---
    renderTasks();
});
