import './style.css';
import { supabase } from './src/supabase.js';

let currentUser = null;

// DOM Elements
const app = document.querySelector('#app');

// Initialize the app
async function init() {
  // Check current session
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user;
  
  renderApp();
  if (currentUser) {
    loadTodos();
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user;
    renderApp();
    if (currentUser) {
      loadTodos();
    }
  });
}

// Render the main app
function renderApp() {
  app.innerHTML = `
    <div class="auth-container">
      ${currentUser 
        ? `<p>Welcome, ${currentUser.email}</p>
           <button onclick="window.handleSignOut()">Sign Out</button>`
        : `<button onclick="window.handleSignIn()">Sign In</button>
           <button onclick="window.handleSignUp()">Sign Up</button>`
      }
    </div>
    ${currentUser ? `
      <div class="todo-container">
        <form class="todo-form" onsubmit="window.handleAddTodo(event)">
          <input type="text" class="todo-input" placeholder="Add a new todo..." required>
          <button type="submit">Add Todo</button>
        </form>
        <ul class="todo-list" id="todoList"></ul>
      </div>
    ` : '<p style="text-align: center">Please sign in to manage your todos</p>'}
  `;
}

// Load todos from Supabase
async function loadTodos() {
  const { data: todos, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading todos:', error);
    return;
  }

  const todoList = document.getElementById('todoList');
  if (!todoList) return;

  todoList.innerHTML = todos.map(todo => `
    <li class="todo-item">
      <input 
        type="checkbox" 
        class="todo-checkbox" 
        ${todo.is_complete ? 'checked' : ''} 
        onchange="window.handleToggleTodo('${todo.id}', this.checked)"
      >
      <span class="todo-text ${todo.is_complete ? 'completed' : ''}">${todo.title}</span>
      <button class="delete-btn" onclick="window.handleDeleteTodo('${todo.id}')">Delete</button>
    </li>
  `).join('');
}

// Auth handlers
window.handleSignUp = async () => {
  const email = prompt('Enter your email:');
  const password = prompt('Enter your password:');
  
  if (!email || !password) return;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert('Error signing up: ' + error.message);
  } else {
    alert('Check your email for the confirmation link!');
  }
};

window.handleSignIn = async () => {
  const email = prompt('Enter your email:');
  const password = prompt('Enter your password:');
  
  if (!email || !password) return;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert('Error signing in: ' + error.message);
  }
};

window.handleSignOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    alert('Error signing out: ' + error.message);
  }
};

// Todo handlers
window.handleAddTodo = async (event) => {
  event.preventDefault();
  const input = event.target.querySelector('input');
  const title = input.value.trim();
  
  const { error } = await supabase
    .from('todos')
    .insert([{ title, user_id: currentUser.id }]);

  if (error) {
    alert('Error adding todo: ' + error.message);
  } else {
    input.value = '';
    loadTodos();
  }
};

window.handleToggleTodo = async (id, isComplete) => {
  const { error } = await supabase
    .from('todos')
    .update({ is_complete: isComplete })
    .eq('id', id);

  if (error) {
    alert('Error updating todo: ' + error.message);
    loadTodos(); // Reload to revert the checkbox
  }
};

window.handleDeleteTodo = async (id) => {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) {
    alert('Error deleting todo: ' + error.message);
  } else {
    loadTodos();
  }
};

// Initialize the app
init();