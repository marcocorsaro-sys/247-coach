// Account non abilitato su 24/7 Coach (es. account dell'app di Irene).
export default function NoAccess() {
  return (
    <div className="login-wrap">
      <div className="login-box">
        <span className="mono">// 24/7 COACH</span>
        <h1>Account non abilitato</h1>
        <p>Questo account non appartiene a 24/7 Coach. / This account is not a 24/7 Coach account.</p>
        <form action="/auth/signout" method="post" style={{ marginTop: 16 }}><button className="btn btn-primary" type="submit">Esci / Log out</button></form>
      </div>
    </div>
  );
}
