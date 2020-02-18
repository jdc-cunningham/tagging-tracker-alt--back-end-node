### Deployment
- [ ] make it easier/better

### Node
- [ ] handle case where no `AWS` credentials can break server
- [ ] check any `Throw error()` calls, these break `Node`

### Database
- [ ] make sure table seeding works from scratch

### Extra
- [ ] determine max connection limit for MySQL based on RAM/buffer/etc calculations
- [ ] image downsizing on remote side eg. with `jimp` this isn't really needed as the client resizes the images/displays using thumbnails