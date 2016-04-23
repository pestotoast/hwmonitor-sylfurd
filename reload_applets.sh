# replace the EXTENSION_UUID with your extension/applet/desklet name
# dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension string:'EXTENSION_UUID' string:'TYPE'



cp -rv hwmonitor\@sylfurd/*  ~/.local/share/cinnamon/applets/hwmonitor\@sylfurd
dbus-send --session --dest=org.Cinnamon.LookingGlass --type=method_call /org/Cinnamon/LookingGlass org.Cinnamon.LookingGlass.ReloadExtension string:'hwmonitor@sylfurd' string:'APPLET'
