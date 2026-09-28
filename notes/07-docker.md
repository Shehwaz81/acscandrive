# Docker

## The problem it solves

Software depends on its environment: the OS, installed libraries, exact versions, config files. "It works on my machine" happens because two machines differ in some way nobody wrote down. The Supabase stack is a good example. It's Postgres plus an auth server, an HTTP API server (PostgREST), storage, and more, each needing specific versions.

## Containers

A **container** is a normal process on your computer that the operating system *isolates* so it believes it has a machine to itself:

- **Its own filesystem**, with its own libraries and binaries, separate from yours.
- **Its own view of processes and network**: it can't see your other programs, and gets its own ports. (On Linux these are called *namespaces*.)
- **Resource limits** on CPU and memory. (Linux *cgroups*.)

Unlike a **virtual machine**, a container doesn't boot a whole separate operating system. It shares the host's kernel, so it starts in about a second and uses little memory. A VM emulates an entire computer, which gives stronger isolation but is heavier.

Containers rely on Linux kernel features. On a Mac, Docker Desktop (or OrbStack, Colima) quietly runs one small Linux VM and puts the containers inside it.

## Images vs containers

- An **image** is a read-only template: a filesystem snapshot plus the command to run, for example "Postgres 17 with Supabase's extensions". Images are built in **layers**, so shared layers are downloaded once.
- A **container** is a running instance of an image. You can start many containers from one image, and deleting a container doesn't touch the image.

The relationship is like a class and its objects, or a program file and a running process.

A **Dockerfile** is the recipe for building an image. Because it's text in git, the environment becomes reproducible the same way migrations make a schema reproducible.

## Why it matters for this project

The Supabase CLI uses Docker to run a **complete local copy of Supabase** on your laptop (`supabase start`), using the same images as the hosted service. That lets you:

- Develop and test against a throwaway database instead of the real one with real student data.
- Run every migration from scratch to prove they rebuild the schema.
- Test RLS policies and concurrent writes safely, then reset in seconds.

Some commands also use a container to run a Postgres tool at the right version. For example, `supabase db pull` runs `pg_dump` inside one, so it doesn't depend on whatever Postgres version you have installed.

Docker isn't installed on this machine. That's why the baseline migration was rebuilt from the database catalog instead of pulled with `supabase db pull`, and why local Supabase isn't available yet. Installing Docker Desktop or OrbStack would unlock it. This matters once you start writing policies and donation-entry logic that should be tested before touching production.
