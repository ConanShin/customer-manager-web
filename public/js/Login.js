// Initialize Supabase Config
const supabaseUrl = 'https://hooiszyapcowfyccwpoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2lzenlhcGNvd2Z5Y2N3cG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzYwMDcsImV4cCI6MjA4MjYxMjAwN30.nc-Ri_Rh8anM4LhsvpWHxvUiyKj0Is7FJ438ptZOR-Q';
const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

// Get Elements
var txtEmail = document.getElementById('txtEmail');
var txtPassword = document.getElementById('txtPassword');
var btnLogin = document.getElementById('btnLogin');

// Login Event
btnLogin.addEventListener('click', async e => {
	const email = txtEmail.value;
	const pass = txtPassword.value;

	const { data, error } = await _supabase.auth.signInWithPassword({
		email: email,
		password: pass,
	})

	if (error) {
		console.log(error.message);
		alert("Login failed: " + error.message);
	}
});

_supabase.auth.onAuthStateChange((event, session) => {
	if (session) {
		location.replace("/html/CustomerList.html");
	} else {
		console.log('not logged in');
	}
});