document.querySelector("form").addEventListener("submit", async function(e) {
    e.preventDefault();

    const email = document.getElementById("emailaddress").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) return;

    const btn = document.querySelector("button[type='submit']");
    btn.disabled = true;

    try {
        const res = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            window.location.href = "/";
        } else {
            alert(data.detail || "Credenciales incorrectas.");
            btn.disabled = false;
        }
    } catch {
        alert("Error de conexión.");
        btn.disabled = false;
    }
});