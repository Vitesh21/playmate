import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";

@Controller("account-deletion")
export class AccountDeletionController {
  @Get()
  async page(@Res() response: Response) {
    response.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Delete your Playmate account</title>
<style>body{font:16px system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 20px;color:#17202a}label{display:block;margin:18px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #9aa4af;border-radius:8px}button{margin-top:20px;padding:12px 18px;border:0;border-radius:8px;background:#b42318;color:white;font-weight:700}#status{margin-top:18px}</style>
</head><body><main><h1>Delete your Playmate account</h1><p>Sign in below to request permanent account deletion. Your sign-in details are used only to verify your identity and are not stored by this page.</p>
<form id="delete-form"><label for="email">Account email</label><input id="email" type="email" autocomplete="username" required><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" required><button type="submit">Delete account and profile</button></form><p id="status" role="status" aria-live="polite"></p>
<p>Booking and payment records may be retained when needed for accounting, fraud prevention, or dispute handling; direct profile details are anonymized.</p>
<script>document.getElementById('delete-form').addEventListener('submit',async function(event){event.preventDefault();const status=document.getElementById('status');const button=this.querySelector('button');button.disabled=true;status.textContent='Verifying account…';try{const login=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});const loginBody=await login.json();const token=loginBody&&loginBody.data&&loginBody.data.session&&loginBody.data.session.access_token;if(!login.ok||!token)throw new Error('Could not verify those sign-in details. Check them and try again.');status.textContent='Deleting account…';const deletion=await fetch('/users/me',{method:'DELETE',headers:{Authorization:'Bearer '+token}});if(!deletion.ok)throw new Error('Deletion could not be completed. Please contact Playmate support.');this.reset();status.textContent='Your account has been deleted and your profile details anonymized.';}catch(error){status.textContent=error.message||'Something went wrong. Please try again.';}finally{button.disabled=false;}});</script></main></body></html>`);
  }
}
