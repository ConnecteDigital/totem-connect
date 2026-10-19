package br.com.connectdigital.totemtablet

import android.app.admin.DeviceAdminReceiver

/** Só existe para o app poder ser "administrador do dispositivo" (apagar a tela). */
class AdminReceiver : DeviceAdminReceiver()
