<script>
  <% for (role in roles) { %>
    function show<%- roles[role].cleanname %>(){$('#<%- roles[role].cleanname %>').modal('show')};
                          <% } %>
</script>