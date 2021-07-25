iptables -I OUTPUT 1 -p tcp --dport 443 -d registry.npmjs.org -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d dl.google.com -j ACCEPT
ip6tables -I OUTPUT 1 -p tcp --dport 443 -d dl.google.com -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d 172.217/16 -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d registry.npmjs.org -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d storage.googleapis.com -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d 104.20/16 -j ACCEPT
iptables -I OUTPUT 1 -p tcp --dport 443 -d 216.58.205.240 -j ACCEPT

